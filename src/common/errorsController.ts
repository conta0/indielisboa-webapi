import { Request, Response } from "express";
import { ValidateError } from "tsoa";
import { BadRequestError, ServerError } from "./interfaces";

/**
 * Run this handler when an error is raised. For example, the server can't connect to the database. 
 * 
 * @param error Error object.
 * @param request Express Request object.
 * @param response Express Response object.
 * @param next Callback function. Will be ignored.
 */
export function requestErrorHandler(error: Error, request: Request, response: Response, next: Function): void {
    console.error(error);

    // Reflection by looking at the error's constructor. typeof doesn't work here. 
    const type = error.constructor;
    switch(type) {
        case ValidateError:
           validationErrorResponse(response, error as ValidateError);
           break;
        case SyntaxError:
            syntaxErrorResponse(response, error as SyntaxError);
        default:
            defaultErrorResponse(response);
    }
}

/**
 * When the client sends a request with bad format (query, params or body), send a 400 Bad Request JSON response.
 * The response should contain all the information necessary for the client to correct the request.
 */
function validationErrorResponse(response: Response, error: ValidateError): void {
    const badRequestError: BadRequestError = {
        status: 400,
        error: {
            fields: error.fields
        }
    };
    response.status(400).json(badRequestError);
}

/**
 * When the client sends a request with wrong JSON syntax, send a 400 Bad Request JSON response.
 */
function syntaxErrorResponse(response: Response, error: SyntaxError): void {
    const badRequestError: BadRequestError = {
        status: 400,
        error: {
            message: "Expected a JSON request."
        }
    };

    response.status(400).json(badRequestError);
}

/**
 * All unexpected errors (e.g., no database connection), are send as a 500 Internal Server Error JSON response.
 */
function defaultErrorResponse(response: Response): void {
    const error: ServerError = {
        status: 500,
        error: {}
    }
    response.status(500).json(error);
}