import express, {Request, Response} from "express";
import moment from "moment";

import {Location, Sale, SaleItem, User} from "./model";
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

interface Authentication extends Request {
    auth: {
        userId: string,
        role: number,
    }
}

const DATE_FORMAT = "YYYY-MM-DDThh:mm:ssZ";

const ROLE_AUTHORIZATION_COOKIE = "Role-Authorization";
// Different levels of permissions for possible roles (binary mask).
// Byte 0: create new sales, view detailed product info, etc
// Byte 1: manage products, manage locations, manage user accounts (i.e. maximum privileges)
enum Role {
    COMMON = 0b00,
    SELLER = 0b01,
    ADMIN = 0b11,
};

export function initRouter(database: any) {
    const router = express.Router();
    
    // ------------------------------ TODO Authentication ------------------------------
    router.use(placeholderAuth);
    const AUTH_KEYS = new Map<string, Role>();
    AUTH_KEYS.set("guest-1", Role.COMMON);
    AUTH_KEYS.set("seller", Role.SELLER);
    AUTH_KEYS.set("admin", Role.ADMIN);

    function placeholderAuth(request: Request, response: Response, next: any) {
        console.log("auth");

        //console.log(request.headers["role-authorization"]);
        const userRoleCookie = request.cookies[ROLE_AUTHORIZATION_COOKIE];
        console.log(`cookie value: ${userRoleCookie}`);
        const role = AUTH_KEYS.get(userRoleCookie) ?? Role.COMMON;

        const req: Authentication = request as any;
        req.auth = {
            userId: userRoleCookie,
            role: role || Role.COMMON
        };
        console.log(req.auth);
        next();
    }

    // --------------------------------------------------------------------------------

    // Products

    // Locations
    router.get("/locations", getLocations);
    router.post("/locations", validateAdmin, postLocations);

    // Sales
    router.get("/sales", validateAdmin, getSales);
    router.post("/sales", validateSeller, postSales);

    // Users
    router.get("/users", validateAdmin, getUsers);
    router.post("/users", postUsers);
    router.patch("/users/:userId", patchUserById);

    // Uncaught Server Errors
    router.use(serverErrorHandler);
    
    return router;

    function validateAdmin(request: Request, response: Response, next: Function) {
        console.log("admin check");
        if (hasRole(request as Authentication, Role.ADMIN)) {
            return next();
        }

        sendError(response, 403, Errors.FORBIDDEN);
    }
    
    function validateSeller(request: Request, response: Response, next: Function) {
        console.log("seller check");
        if (hasRole(request as Authentication, Role.SELLER)) {
            return next();
        }

        sendError(response, 403, Errors.FORBIDDEN);
    }

    function hasRole(request: Authentication, targetRole: Role): boolean {
        const role = request.auth.role;
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
        const userId: string = (request as Authentication).auth.userId;
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

        const userIdAuth: string = (request as Authentication).auth.userId;
        const userIdParam: string = request.params.userId;
        const userDetails: UpdateUserDto = request.body;
        const isAdmin: boolean = hasRole(request as Authentication, Role.ADMIN);

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