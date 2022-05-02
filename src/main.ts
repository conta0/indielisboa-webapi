import express, {Express, Request, Response} from "express";
import cookieParser from "cookie-parser";
import { isatty } from "tty";

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 8080;

type BadRequestError = {
    code: number,
    name: string,
    description: string
}

class ParameterCollection {
    list: any = {};

    addIfPresent(name: string, value: any) {
        this.list[name] ??= value;
    }
}

class Location {
    address: string;

    constructor(address: string) {
        this.address = address;
    }
}

type Stock = {
    product: string,
    location: string,
    quantity: number
}

type Sale = {
    seller: string,
    totalPrice: number,
    list: Array<Stock>
}

const locationRepository = [
    new Location("location-1"),
    new Location("location-2"),
    new Location("location-3"),
];

const saleRepository: Array<Sale> = [

];

const ACTION_AUTHORIZATION_COOKIE = "Action-Authorization";
// Different levels of permissions for possible actions (binary mask).
// Byte 0: create new sales, view detailed product info, etc
// Byte 1: manage products, manage locations, manage user accounts (i.e. maximum priveleges)
enum Action {
    Common = 0b00,
    Seller = 0b01,
    Admin = 0b11,
}

// JSON middleware
app.use(express.json());
// Cookie parser middleware
app.use(cookieParser());

// ------------------------------ TODO Authentication ------------------------------
app.use(placeholderAuth);
const AUTH_KEYS = new Map<string, Action>();
AUTH_KEYS.set("guest-1", Action.Common);
AUTH_KEYS.set("seller", Action.Seller);
AUTH_KEYS.set("admin", Action.Admin);

function placeholderAuth(request: Request, response: Response, next: Function) {
    // Do something here
    console.log("auth");
    //console.log(request.headers["action-authorization"]);
    next();
}

// --------------------------------------------------------------------------------

// Routes
app.get("/api/v1/locations", getLocations);
app.post("/api/v1/locations", isAdmin, postLocations);
app.get("/api/v1/sales", isAdmin, getSales);

// Start server
app.listen(PORT);

// Locations
function getLocations(request: Request, response: Response) {
    console.log("get locations");
    
    response.status(200);
    response.send({
        result: locationRepository.map(location => location.address)
    });
    response.end();
}

function postLocations(request: Request, response: Response) {
    console.log("post locations");

    // Check request format
    const body = request.body;
    const address = "" + body.address;

    // Create new location
    const newLocation = new Location(address);
    locationRepository.push(newLocation);
    const lid = newLocation.address;
    response.status(201);
    response.send({
        result: {
            lid,
            address,
        }
    });
    response.end();
}

// Sales
function getSales(request: Request, response: Response) {
    const query = request.query;
    let limit = Number(query.limit) ?? 10;
    let page = Number(query.page) ?? 0;
    let dateStart = query.dateStart;
    let dateEnd = query.dateEnd;
    let seller = query.seller;
    let product = query.product;
    console.log(limit);

    // Validate search parameters
    const params: ParameterCollection = new ParameterCollection();
    if (typeof limit !== "number" || limit < 0) {
        return sendBadRequest(response, {
            code: 0,
            name: "sales_invalid_limit", 
            description: "'limit' parameter must be a positive integer."
        });
    }
    params.addIfPresent("limit", limit);
    
    if (typeof page !== "number" || page < 0) {
        return sendBadRequest(response, {
            code: 0,
            name: "sales_invalid_page",
            description: "'page' parameter must be a positive integer."
        });
    }
    params.addIfPresent("page", page);

    console.log(params.list);
    response.end();
}

function isAdmin(request: Request, response: Response, next: Function) {
    console.log("admin check");
    if (!isAuthorized(request, Action.Admin)) {
        return sendForbidden(response);
    }
    
    next();
}

function isSeller(request: Request, response: Response, next: Function) {
    console.log("seller check");
    if (!isAuthorized(request, Action.Seller)) {
        return sendForbidden(response);
    }
    
    next();    
}

function isAuthorized(request: Request, targetAction: Action) {
    const userActionCookie = request.cookies[ACTION_AUTHORIZATION_COOKIE];
    console.log(userActionCookie);
    const action = AUTH_KEYS.get(userActionCookie) ?? Action.Common;
    return ((action & targetAction) === targetAction);
}

function sendBadRequest(response: Response, error: BadRequestError) {
    response.status(400);
    response.send({error: error});
    response.end();
}

function sendForbidden(response: Response) {
    response.status(403);
    response.send({
        error: {
            code: 0,
            name: "forbidden",
            description: "Not enough permissions for this action.",
        }
    });
    response.end();
}