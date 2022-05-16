import { FieldErrors } from "tsoa"

/**
 * JSON response format for a "400 Bad Request" error.
 */
export interface BadRequestError {
    status: 400,
    error: {
        message?: string,
        fields?: FieldErrors
    }
}

/**
 * JSON response format for a "401 Unauthorized" error.
 */
export interface AuthenticationError {
    status: 401,
    error: {
        [key: string]: string
    }
}

/**
 * JSON response format for a "403 Forbidden" error.
 */
export interface AuthorizationError {
    status: 403,
    error: {
        [key: string]: string
    }
}

/**
 * JSON response format for a "404 Not Found" error.
 */
export interface NotFoundError {
    status: 404,
    error: {
        [key: string]: string
    }
}

/**
 * JSON response format for a "500 Internal Server Error" error.
 */
export interface ServerError {
    status: 500,
    error: {
        [key: string]: string
    }
}

/**
 * Represents the result of a service operation. On a successful operation, "data" must be either a single instance
 * or a collection of T (may be an empty collection).
 * 
 * If the operation fails, then "error" should describe the reason.
 * 
 * "data" and "error" are mutually exclusive. When one is present, the other is undefined.
 * 
 * @param data Represents an instance or a collection of T.
 * @param error Represents a service error.
 */
export type ServiceResult<T> = ServiceSuccess<T> | ServiceError<T>

interface ServiceSuccess<T> {
    result: T | T[],
    error?: never
}

interface ServiceError<T> {
    result?: never,
    error: {
        message: string
    }
}