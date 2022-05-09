import express, {Request, Response} from "express";
import moment from "moment";

import {Location, Sale, SaleItem} from "./model";
import {ERRORS as Errors, APIError} from "./errors";

// Moment.js spams warnings for badly formatted dates. This option supresses them. 
moment.suppressDeprecationWarnings = true;

class ParameterCollection {
    list: Map<string, any> = new Map();
    
    addIfExists(key: string, value: any) {
        if (value != null) {
            this.list.set(key, value);
        }
    }
    
    print() {
        console.log(this.list.keys());
        console.log(this.list.values());
    }
}

interface SearchSaleDto {
    limit?: number,
    page?: number,
    dateStart?: string,
    dateEnd?: string,
    seller?: string,
    product?: string,
    location?: string,
};

interface CreateSaleDto {
    seller: string,
    totalPrice: number,
    list: Array<SaleItem>,
}

interface SearchUserDto {
    role?: string,
}

interface CreateUserDto {
    email: string,
    name: string,
}

interface UpdateUserDto {
    name?: string,
    email?: string,
    role?: string,
}

interface User {
    userId: string,
    role: string,
}

interface Authentication {
    userId: string,
    role: string,
}

interface RequestAuthentication extends Request {
    auth: Authentication,
}

const DATE_FORMAT = "YYYY-MM-DDThh:mm:ssZ";

const USER_AUTHENTICATION_COOKIE = "User-Authentication";
// Different levels of permissions for possible roles (binary mask).
// Byte 0: create new sales, view detailed product info, etc
// Byte 1: manage products, manage locations, manage user accounts (i.e. maximum privileges)
enum Role {
    NONE = 0b00,
    SELLER = 0b01,
    ADMIN = 0b11,
};

export function initRouter(database: any) {
    const router = express.Router();
    
    // ------------------------------ TODO Proper Authentication ------------------------------
    router.use(placeholderAuth);

    function placeholderAuth(request: Request, response: Response, next: any) {
        console.log("auth");

        const authenticationCookie: string = request.cookies[USER_AUTHENTICATION_COOKIE];
        console.log(`cookie value: ${authenticationCookie}`);
        
        // If the cookie is valid, append authentication info to request
        if (authenticationCookie != null) {
            const auth: Authentication = JSON.parse(Buffer.from(authenticationCookie, "base64").toString());

            (request as RequestAuthentication).auth = {
                userId: auth.userId,
                role: auth.role.toUpperCase(),
            };
            console.log("auth:", auth);
        }
        next();
    }

    function loginUser(request: Request, response: Response) {
        console.log("login");

        // If the user is already logged in, this step is skipped
        if ((request as RequestAuthentication).auth == null ) {
            const authRegex: RegExp = /^Basic username=[a-z]\w{2,}&password=\w{3,}$/gi;
            const basicAuthentication: string = request.headers.authorization || "";

            // Authentication format is valid
            if (authRegex.test(basicAuthentication)) {
                // Get username and password
                const matches = basicAuthentication.match(/=[^&]+/gi);
                const username = matches?.at(0)?.slice(1);
                const password = matches?.at(1)?.slice(1);

                // Check user credentials
                const user: User = database.getUserWithCredentials(username, password);

                // User is now logged in. Set cookie for future requests.
                if (user != null) {
                    const auth: Authentication = {
                        userId: user.userId,
                        role: user.role.toUpperCase(),
                    };

                    const cookie: string = Buffer.from(JSON.stringify(auth)).toString("base64");
                    response.cookie(USER_AUTHENTICATION_COOKIE, cookie);
                    return sendEmpty(response, 204);
                }
            }

            response.setHeader("WWW-Authenticate", "Basic");
            return sendError(response, 401, Errors.AUTH_INVALID_LOGIN);
        }

        console.log("already logged in");
        sendEmpty(response, 204);
    }

    function logoutUser(request: Request, response: Response) {
        console.log("logout");
        
        // Clear cookie
        response.clearCookie(USER_AUTHENTICATION_COOKIE);
        sendEmpty(response, 204);
    }
    // --------------------------------------------------------------------------------

    // Authentication
    router.post("/auth/login", loginUser);
    router.post("/auth/logout", logoutUser);

    // Products

    // Locations
    router.get("/locations", getLocations);
    router.post("/locations", isAuthenticated, isAdmin, postLocations);

    // Sales
    router.get("/sales", isAuthenticated, isAdmin, getSales);
    router.post("/sales", isAuthenticated, isSeller, postSales);

    // Users
    router.get("/users", isAuthenticated, isAdmin, getUsers);
    router.post("/users", postUsers);
    router.patch("/users/:userId", isAuthenticated, patchUserById);

    // Uncaught Server Errors
    router.use(serverErrorHandler);
    
    return router;

    function isAdmin(request: Request, response: Response, next: Function) {
        console.log("admin check");
        
        if (hasRole(request as RequestAuthentication, Role.ADMIN)) {
            return next();
        }

        sendError(response, 403, Errors.FORBIDDEN);
    }
    
    function isSeller(request: Request, response: Response, next: Function) {
        console.log("seller check");
        if (hasRole(request as RequestAuthentication, Role.SELLER)) {
            return next();
        }

        sendError(response, 403, Errors.FORBIDDEN);
    }

    function isAuthenticated(request: Request, response: Response, next: Function) {
        console.log("authenticated check");
        
        if ((request as RequestAuthentication).auth != null) {
            return next();
        }

        // User isn't authenticated
        response.setHeader("WWW-Authenticate", "Basic");
        sendError(response, 401, Errors.AUTH_MUST_LOGIN);
    }

    function hasRole(request: RequestAuthentication, targetRole: Role): boolean {
        // We want to retrieve a enum value indexed by a key (string), but doing it directly
        // Enum[key] results in a compile error.
        // We could disable typescript's type checking, with the annotation @ts-ignore, to bypass the error.
        // While that solution works, we can avoid it by accessing the collection of enum keys first
        // and then match the key.
        let role: Role = Role[request.auth.role as keyof typeof Role];
        return (role & targetRole) === targetRole;
    }

    function getLocations(request: Request, response: Response) {
        console.log("get locations");
    
        const locations: Location[] = database.findLocations();
        sendResult(response, 200, locations);
    }

    function postLocations(request: Request, response: Response) {
        console.log("post locations");

        const body = request.body;
        const address: string = "" + body.address;
        const location: Location = database.addLocation(address);
        
        sendResult(response, 201, location);
    }

    function getSales(request: Request, response: Response) {
        console.log("get sales");

        // Default values
        const query: SearchSaleDto = request.query;
        query.limit ??= 10;
        query.page ??= 0;
        
        // Validate search paramaters
        const params: ParameterCollection = new ParameterCollection();

        // Limit
        if (isNaN(query.limit) || query.limit < 1) {
            return sendError(response, 400, Errors.SEARCH_SALES_INVALID_LIMIT);
        }
        params.addIfExists("limit", query.limit);
        
        // Page
        if (isNaN(query.page) || query.page < 0) {
            return sendError(response, 400, Errors.SEARCH_SALES_INVALID_PAGE);
        }
        params.addIfExists("page", query.page);
        
        // Date Start
        // moment(undefined) -> current time. To avoid this quirky behaviour, we check for null first.
        if (query.dateStart != null) {
            const momentStart = moment(query.dateStart);
            if (!momentStart.isValid()) {
                return sendError(response, 400, Errors.SEARCH_SALES_INVALID_DATESTART);
            }
            params.addIfExists("dateStart", momentStart.format(DATE_FORMAT));
        }

        // Date End
        if (query.dateEnd != null) {
            const momentStart = moment(query.dateEnd);
            if (!momentStart.isValid()) {
                return sendError(response, 400, Errors.SEARCH_SALES_INVALID_DATEEND);
            }
            params.addIfExists("dateEnd", momentStart.format(DATE_FORMAT));
        }

        params.addIfExists("seller", query.seller);
        params.addIfExists("product", query.product);
        params.addIfExists("location", query.location);

        // Query Database
        params.print();
        const sales: Array<Sale> = database.findSales(params);
        sendResult(response, 200, sales);
    }

    function postSales(request: Request, response: Response) {
        console.log("post sales");
        
        const body = request.body;
        const userId: string = (request as RequestAuthentication).auth.userId;
        const newSale: CreateSaleDto = body;
        newSale.seller = userId;

        // Check request format
        if (isNaN(newSale.totalPrice) || newSale.totalPrice < 0) {
            return sendError(response, 400, Errors.CREATE_SALES_INVALID_PRICE);
        }

        for (let item of newSale.list) {
            if (item.product == null) {
                return sendError(response, 400, Errors.CREATE_SALES_INVALID_PRODUCT);
            }
            if (item.location == null) {
                return sendError(response, 400, Errors.CREATE_SALES_INVALID_LOCATION);
            }
            if (item.quantity == null) {
                return sendError(response, 400, Errors.CREATE_SALES_INVALID_QUANTITY);
            }
        }

        const createdSale = database.createSale(newSale);
        sendResult(response, 201, createdSale);
    }

    function getUsers(request: Request, response: Response) {
        console.log("get users");

        // Validate request format
        const search: SearchUserDto = request.query;
        search.role = search.role?.toUpperCase();
        if (search.role && !(search.role in Role)) {
            sendError(response, 400, Errors.SEARCH_USERS_INVALID_ROLE);
        }

        const userList = database.findUsers(search);
        sendResult(response, 200, userList);
    }

    function postUsers(request: Request, response: Response) {
        console.log("post users");

        // Validate request format
        const newUser: CreateUserDto = request.body;
        if (newUser.email == null) {
            return sendError(response, 400, Errors.CREATE_USER_INVALID_EMAIL);
        }

        //console.log(request.originalUrl);
        const createdUser = database.createUser(newUser);
        sendResult(response, 201, createdUser);
    }

    function patchUserById(request: Request, response: Response) {
        console.log("patch user by id");

        const userIdAuth: string = (request as RequestAuthentication).auth.userId;
        const userIdParam: string = request.params.userId;
        const userDetails: UpdateUserDto = request.body;
        const isAdmin: boolean = hasRole(request as RequestAuthentication, Role.ADMIN);

        // Only admins, or the own user, can change their details
        if (!isAdmin && !(userIdAuth === userIdParam)) {
            return sendError(response, 403, Errors.FORBIDDEN);
        }

        // Only admins can change a user's role
        if (!isAdmin) {
            userDetails.role = undefined;
        }
        database.updateUser(userIdParam, userDetails);
        sendEmpty(response, 204);
    }

    function serverErrorHandler(error: Error, request: Request, respose: Response, next: Function) {
        console.error(error);

        sendError(respose, 500, Errors.INTERNAL_SERVER_ERROR);
    }

    function sendEmpty(response: Response, status: number) {
        response.status(status);
        response.end();
    }
    
    function sendResult(response: Response, status: number, result: any) {
        response.status(status);
        response.json({result: result});
        response.end();
    }
    
    function sendError(response: Response, status: number, error: APIError) {
        response.status(status);
        response.json({error: error});
        response.end();
    }
}