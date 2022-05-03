import express, {Router, Request, Response} from "express";
import {Location, Sale} from "./model";
import {ERRORS, APIError} from "./errors";

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

type SaleSearchParameters = {
    limit?: number,
    page?: number,
    dateStart?: string,
    dateEnd?: string,
    seller?: string,
    product?: string,
    location?: string,
};

const ACTION_AUTHORIZATION_COOKIE = "Action-Authorization";
// Different levels of permissions for possible actions (binary mask).
// Byte 0: create new sales, view detailed product info, etc
// Byte 1: manage products, manage locations, manage user accounts (i.e. maximum priveleges)
const enum Action {
    Common = 0b00,
    Seller = 0b01,
    Admin = 0b11,
};

export function initRouter(database: any) {
    const router = express.Router();
    
    // ------------------------------ TODO Authentication ------------------------------
    router.all("*", placeholderAuth);
    const AUTH_KEYS = new Map<string, Action>();
    AUTH_KEYS.set("guest-1", Action.Common);
    AUTH_KEYS.set("seller", Action.Seller);
    AUTH_KEYS.set("admin", Action.Admin);

    function placeholderAuth(request: Request, response: Response, next: any) {
        console.log("auth");

        //console.log(request.headers["action-authorization"]);
        next();
    }

    // --------------------------------------------------------------------------------

    // Products

    // Locations
    router.get("/locations", getLocations);
    router.post("/locations", isAdmin, postLocations);
    
    // Stock

    // Sales
    router.get("/sales", isAdmin, getSales);
    router.post("/sales", isSeller, postSales);

    // SaleItem

    // Users


    return router;

    function isAdmin(request: Request, response: Response, next: Function) {
        console.log("admin check");
        isAuthorized(request, response, next, Action.Admin);
    }
    
    function isSeller(request: Request, response: Response, next: Function) {
        console.log("seller check");
        isAuthorized(request, response, next, Action.Seller);
    }
    
    function isAuthorized(request: Request, response: Response, next: Function, targetAction: Action) {
        const userActionCookie = request.cookies[ACTION_AUTHORIZATION_COOKIE];
        console.log(`cookie value: ${userActionCookie}`);
        const action = AUTH_KEYS.get(userActionCookie) ?? Action.Common;
        if ((action & targetAction) === targetAction) {
            return next();
        }
    
        sendError(response, 403, ERRORS.FORBIDDEN_ERROR);
    }

    function getLocations(request: Request, response: Response) {
        console.log("get locations");
    
        const locations: Array<Location> = database.findLocations();
        sendResult(response, 200, locations);
    }

    function postLocations(request: Request, response: Response) {
        console.log("post locations");

        const body = request.body;
        const address = "" + body.address;
        const location: Location = database.addLocation(address);
        sendResult(response, 201, location);
    }

    function getSales(request: Request, response: Response) {
        console.log("get sales");

        // Default values
        const query: SaleSearchParameters = request.query;
        query.limit ??= 10;
        query.page ??= 0;

        // Validate search paramaters
        const limit = query.limit;
        const page = query.page;
        const dateStart = query.dateStart;
        const dateEnd = query.dateEnd;
        
        const params: ParameterCollection = new ParameterCollection();
        if (isNaN(limit) || limit < 1) {
            return sendError(response, 400, ERRORS.SALES_INVALID_LIMIT);
        }
        params.addIfExists("limit", limit);
        
        if (isNaN(limit) || page < 0) {
            return sendError(response, 400, ERRORS.SALES_INVALID_PAGE);
        }
        params.addIfExists("page", page);
        params.print();
    
        const sales: Array<Sale> = database.findSales();
        sendResult(response, 200, sales);
    }

    function postSales(request: Request, response: Response) {
        console.log("post sales");
        
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