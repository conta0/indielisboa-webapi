import { Request, Response } from "express";
import { FieldErrors, ValidateError } from "tsoa";
import { AuthenticationErrorResponse, BadRequestErrorResponse, ConflitErrorResponse, ForbiddenErrorResponse, NotFoundErrorResponse, ServerErrorResponse } from "./responses";

export enum ErrorCode {
    UNSPECIFIED = "unspecified",
    TOKEN_MISSING = "token.missing",
    TOKEN_EXPIRED = "token.expired",
    TOKEN_INVALID = "token.invalid",
    PRIVILEGE = "privilege",
    REQ_SYNTAX = "request.syntax",
    REQ_FORMAT = "request.format",
    REQ_DATA = "request.data",
}

interface SimpleErrorConstructor {
    code?: ErrorCode,
    message?: string,
    fields?: FieldErrors,
}

/**
 * A wrapper class for the application custom errors.
 * We don't need a stack frame for this type of errors.
 */
class SimpleError {
    name?: string;
    code?: ErrorCode;
    message?: string;
    fields?: FieldErrors;

    constructor(params?: SimpleErrorConstructor) {
        this.name = "SimpleError";
        this.message = params?.message;
        this.code = params?.code || ErrorCode.UNSPECIFIED;
        this.fields = params?.fields;
    }
}

export class BadRequestError extends SimpleError {name = "BadRequestError"}
export class AuthenticationError extends SimpleError {name = "AuthenticationError"};
export class ForbiddenError extends SimpleError {name = "ForbiddenError"};
export class NotFoundError extends SimpleError {name = "NotFoundError"};
export class ConflitError extends SimpleError {name = "ConflitError"}

/**
 * Run this handler when an error is raised. For example, the server can't connect to the database. 
 * 
 * @param error Error object.
 * @param request Express Request object.
 * @param response Express Response object.
 * @param next Callback function. Will be ignored.
 */
export function requestErrorHandler(error: Error | SimpleError, request: Request, response: Response, next: Function): void {
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
        case BadRequestError:
            sendBadRequestError(response, error as BadRequestError);
            break;
        case AuthenticationError:
            sendAuthenticationError(response, error as AuthenticationError);
            break;
        case ForbiddenError:
            sendAuthorizationError(response, error as ForbiddenError);
            break;
        case NotFoundError:
            sendNotFoundError(response, error as NotFoundError);
            break;
        case ConflitError:
            sendConflitError(response, error as ConflitError);
            break;
        default:
            sendUnexpectedServerError(response);
    }
}

/**
 * When the client sends a request with bad format (query, params or body), send a "400 Bad Request" JSON response.
 * The response should contain all the information necessary for the client to correct the request.
 * 
 * @param response Express Response object.
 * @param error ValidateError object.
 */
async function sendValidationError(response: Response, error: ValidateError): Promise<void> {
    const body: BadRequestErrorResponse = {
        status: 400,
        error: {
            code: ErrorCode.REQ_FORMAT,
            fields: error.fields
        }
    };
    response.status(400).json(body);
}

/**
 * When the client sends a request with wrong JSON syntax, send a "400 Bad Request" JSON response.
 * 
 * @param response Express Response object.
 * @param error SyntaxError object.
 */
async function sendSyntaxError(response: Response, error: SyntaxError): Promise<void> {
    const body: BadRequestErrorResponse = {
        status: 400,
        error: {
            code: ErrorCode.REQ_SYNTAX,
            message: "Expected a JSON request."
        }
    };

    response.status(400).json(body);
}

/**
 * When the client's request is malformed or contains invalid data, even after passing through the
 * checks, send a "400 Bad Request" JSON response.
 * 
 * @param response Express Response object.
 * @param error BadRequestError object.
 */
 async function sendBadRequestError(response: Response, error: BadRequestError): Promise<void> {
    const body: BadRequestErrorResponse = {
        status: 400,
        error: {
            code: error.code,
            message: error.message,
            fields: error.fields
        }
    }

    response.status(400).json(body);
}

/**
 * When the client can't be authenticated, send a "403 Forbidden" JSON response.
 * 
 * @param response Express Response object.
 * @param error AuthenticationError object.
 */
 async function sendAuthenticationError(response: Response, error: AuthenticationError): Promise<void> {
    const body: AuthenticationErrorResponse = {
        status: 401,
        error: {
            code: error.code,
            message: error.message
        }
    }

    // The 401 Unauthorized status code states that WWW-Authenticate MUST be used.
    // However, our authentication isn't one of the schemes maintained by IANA.
    // Technically, even though the scheme "Cookie" doesn't exist, we are allowed to use whatever.
    // User agent (e.g. browser) behaviour is undefined in this case.
    response.setHeader("WWW-Authenticate", "Cookie");
    response.status(401).json(body);
}

/**
 * When the client can't access the requested resource, send a "403 Forbidden" JSON response.
 * 
 * @param response Express Response object.
 * @param error AuthorizationError object.
 */
async function sendAuthorizationError(response: Response, error: ForbiddenError): Promise<void> {
    const body: ForbiddenErrorResponse = {
        status: 403,
        error: {
            code: error.code,
            message: error.message
        }
    }

    response.status(403).json(body);
}

/**
 * When the client requests a resource that doesn't exist, send a "401 Not Found" JSON response.
 * 
 * @param response Express Response object.
 * @param error NotFoundError object.
 */
 async function sendNotFoundError(response: Response, error: NotFoundError): Promise<void> {
    const body: NotFoundErrorResponse = {
        status: 404,
        error: {
            code: error.code,
            message: error.message
        }
    }

    response.status(404).json(body);
}

/**
 * When the client requests to create/update a resource, but that resource is duplicated or can't be updated.
 * Send a "409 Conflit" JSON response.
 * 
 * @param response Express Response object.
 * @param error NotFoundError object.
 */
 async function sendConflitError(response: Response, error: ConflitError): Promise<void> {
    const body: ConflitErrorResponse = {
        status: 409,
        error: {
            code: error.code,
            message: error.message,
            fields: error.fields,
        }
    }

    response.status(409).json(body);
}

/**
 * All unexpected errors (e.g., no database connection), are sent as a "500 Internal Server" Error JSON response.
 * 
 * @param response Express Response object.
 */
async function sendUnexpectedServerError(response: Response): Promise<void> {
    const body: ServerErrorResponse = {
        status: 500,
        error: {
            message: "Unexpected error."
        }
    }
    response.status(500).json(body);
}