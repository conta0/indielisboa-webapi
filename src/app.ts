// ------------------------------ Placeholder Database ------------------------------ //
const locationRepository = [
    {address: "location-1"},
    {address: "location-2"},
    {address: "location-3"},
];

const userRepository = [
    {
        username: "admin",
        password: "123",
        userId: "admin",
        role: "admin",
    },
    {
        username: "seller",
        password: "123",
        userId: "seller",
        role: "seller",
    },
    {
        username: "guest1",
        password: "123",
        userId: "guest-1",
        role: "none",
    },
    {
        username: "guest2",
        password: "123",
        userId: "guest-2",
        role: "none",
    }
]

const database: any = {
    findLocations() {
        return locationRepository;
    },
    addLocation(address: string) {
        const newLocation = {address: address};
        locationRepository.push(newLocation);
        return newLocation;
    },
    findSales() {
        return [];
    },
    createSale(ignore: any) {
        return ignore;
    },
    findUsers() {
        return [
            "user-1",
            "user-2"
        ]
    },
    createUser(ignore: any) {
        return ignore;
    },
    updateUser(userId: string, details: any) {
        console.log(userId, details);
    },
    getUserWithCredentials(username: string, password: string) {
        for (let user of userRepository) {
            if (user.username === username && user.password === password) {
                return user;
            }
        }
        
        return null;
    }
};

// -------------------------------------------------------------------------------- //
import express, { Express, Request, Response, Router } from "express";
import swaggerUI from "swagger-ui-express";
import cookieParser from "cookie-parser";

import { initRouter } from "./router";

export const app: Express = express();

// OpenAPI specification
import API_SPECIFICATION from "./api/swagger.json";
const API_PATH = "/api/v1";
API_SPECIFICATION.servers[0].url = API_PATH;


const API_ROUTER = initRouter(database);

// JSON middleware
app.use(express.json());

// Cookie parser middleware
app.use(cookieParser());

// Documentation routes
app.get("/api-docs/openapi.json", (request: Request, response: Response) => {
    response.status(200);
    response.json(API_SPECIFICATION);
    response.end();
});
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(API_SPECIFICATION));

// API Routes
import { RegisterRoutes } from "./api/routes";
import { ValidateError } from "tsoa";
const API_ROUTER_2 = express.Router();
RegisterRoutes(API_ROUTER_2);
app.use(API_PATH, API_ROUTER_2);
app.use(requestErrorHandler);

function requestErrorHandler(error: Error, request: Request, response: Response, next: Function): void {
    console.error(error);
    const type = error.constructor;
    switch(type) {
        case ValidateError:
           validaErrorResponse(response, error as ValidateError);
           break;
        case SyntaxError:
            syntaxErrorResponse(response);
        default:
            defaultErrorResponse(response);
    }
}

function validaErrorResponse(response: Response, error: ValidateError): void {
    response.status(400).json({
        status: 400,
        error: {
            fields: error.fields
        }
    });
}

function syntaxErrorResponse(response: Response): void {
    response.status(400).json({
        status: 400,
        error: {
            message: "Expected a JSON request."
        }
    })
}

function defaultErrorResponse(response: Response): void {
    response.status(500).json({
        status: 500,
        error: {}
    })
}