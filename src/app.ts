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
import express, {Express, Request, response, Response} from "express";
import swaggerUI from "swagger-ui-express";
import swaggerJsdoc  from "swagger-jsdoc";
import * as OpenApiValidator from 'express-openapi-validator';
import cookieParser from "cookie-parser";

import {initRouter} from "./router";

export const app: Express = express();
const ROUTER = initRouter(database);

// API specification

const options = {
    definition: {
        openapi: "3.0.2",
        info: {
            title: "IndieLisboa Stock Management",
            description: "Web API to view/edit product stock, register sales and manage user accounts.",
            version: "1.0.0",
        },
        servers: [
            {
                url: "/api/v1"
            }
        ]
    },
    apis: ["./*.ts", "./*/*.ts"]
};

//const openapiSpec = swaggerJsdoc(options);
import openapiSpec from "./openapi.json";
import { BadRequest, Forbidden, NotFound, Unauthorized } from "express-openapi-validator/dist/openapi.validator";
console.log(openapiSpec);

// JSON middleware
app.use(express.json());

// Cookie parser middleware
app.use(cookieParser());

// OpenAPI validator
const validatorOptions = {
    apiSpec: openapiSpec as any,
    validateRequests: {
        allowUnknownQueryParameters: true
    },
    validateResponses: false,
    ignoreUndocumented: true
}
app.use(OpenApiValidator.middleware(validatorOptions));

// Routes
app.get("/api-docs/openapi.json", (request: Request, response: Response) => response.status(200).json(openapiSpec));
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(openapiSpec));
app.use("/api/v1", ROUTER);


// Default Error handler
import { ERRORS as Errors } from "./errors";
app.use(defaultErrorhandler);

function defaultErrorhandler(error: Error, request: Request, response: Response, next: Function) {
    console.error(error);

    const type = error.constructor;
    switch(type) {
        case BadRequest:
            response.status(400).json({
                error: {
                    code: 400,
                    name: "bad_request",
                    description: "This request format is invalid"
                }
            })
            break;
        case Unauthorized:
            response.status(401).json({
                error: Errors.UNAUTHORIZED
            })
            break;
        case Forbidden:
            response.status(403).json({
                error: Errors.FORBIDDEN
            })
            break;
        case NotFound:
            response.status(404).json({
                error: {
                    code: 404,
                    name: "404_error",
                    description: "Resource not found."
                }
            })
            break;
        default:
            response.status(500).json({
                error: Errors.INTERNAL_SERVER_ERROR
            })
    }
}