import { Request, Response } from "express";
import { ValidateError } from "tsoa";
import { BadRequestErrorResponse, ServerErrorResponse } from "./interfaces";


export class AuthorizationError extends Error {};
export class AuthenticationError extends Error {name = "AuthorizationError"};

/**
 * Run this handler when an error is raised. For example, the server can't connect to the database. 
 * 
 * @param error Error object.
 * @param request Express Request object.
 * @param response Express Response object.
 * @param next Callback function. Will be ignored.
 */
export function requestErrorHandler(error: Error, request: Request, response: Response, next: Function): void {
    console.log("\x1b[31m%s\x1b[0m", `${error.name}: ${error.message}`);

    // Use reflection by looking at the error's constructor. typeof doesn't work here. 
    const type = error.constructor;
    switch(type) {
        case ValidateError:
            sendValidationError(response, error as ValidateError);
            break;
        case SyntaxError:
            sendSyntaxError(response, error as SyntaxError);
            break;
        case AuthenticationError:
            sendAuthenticationError(response, error as AuthenticationError);
            break;
        case AuthorizationError:
            sendAuthorizationError(response, error as AuthorizationError);
            break;
        default:
            sendUnexpectedServerError(response);
    }
}

/**
 * When the client sends a request with bad format (query, params or body), send a "400 Bad Request" JSON response.
 * The response should contain all the information necessary for the client to correct the request.
 * 
 * @param response Express response object.
 * @param error ValidateError object.
 */
async function sendValidationError(response: Response, error: ValidateError): Promise<void> {
    const badRequestError: BadRequestErrorResponse = {
        status: 400,
        error: {
            fields: error.fields
        }
    };
    response.status(400).json(badRequestError);
}

/**
 * When the client sends a request with wrong JSON syntax, send a "400 Bad Request" JSON response.
 * 
 * @param response Express response object.
 * @param error SyntaxError object.
 */
async function sendSyntaxError(response: Response, error: SyntaxError): Promise<void> {
    const badRequestError: BadRequestErrorResponse = {
        status: 400,
        error: {
            message: "Expected a JSON request."
        }
    };

    response.status(400).json(badRequestError);
}

/**
 * When the client can't be authenticated, send a "401 Unauthorized" JSON response.
 * 
 * @param response Express response object.
 * @param error AuthenticationError object.
 */
 async function sendAuthenticationError(response: Response, error: AuthenticationError): Promise<void> {
    const authenticationError = {
        status: 401,
        error: {
            message: error.message
        }
    }

    response.status(401).json(authenticationError);
}

/**
 * When the client can't access the requested resource, send a "403 Forbidden" JSON response.
 * 
 * @param response Express response object.
 * @param error AuthorizationError object.
 */
async function sendAuthorizationError(response: Response, error: AuthorizationError): Promise<void> {
    const authorizationError = {
        status: 403,
        error: {
            message: error.message
        }
    }

    response.status(403).json(authorizationError);
}

/**
 * All unexpected errors (e.g., no database connection), are sent as a "500 Internal Server" Error JSON response.
 * 
 * @param response Express response object.
 */
async function sendUnexpectedServerError(response: Response): Promise<void> {
    const error: ServerErrorResponse = {
        status: 500,
        error: {}
    }
    response.status(500).json(error);
}