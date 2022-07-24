import { FieldErrors } from "tsoa"
import { ErrorCode } from "./errors"

interface BaseErrorResponse {
    status: number,
    error: {
        code?: ErrorCode,
        message?: string,
        fields?: FieldErrors
    }
}

/**
 * JSON response format for a "400 Bad Request" error.
 * 
 * @example {
        "status": 400,
        "error": {
            "message": "Error description.",
            "fields": [
                {
                    "name": {
                        "message": "Reason or description.",
                        "value": "Any value or undefined."
                    }
                }
            ]
        }
    }
 */
export interface BadRequestErrorResponse extends BaseErrorResponse {
    status: 400,
}

/**
 * JSON response format for a "401 Unauthorized" error.
 * 
 * @example {
 *  "status": 401,
 *  "error": {}
 * }
 */
export interface AuthenticationErrorResponse extends BaseErrorResponse {
    status: 401,
}

/**
 * JSON response format for a "403 Forbidden" error.
 * 
 * @example {
 *  "status": 403,
 *  "error": {}
 * }
 */
export interface ForbiddenErrorResponse extends BaseErrorResponse {
    status: 403,
}

/**
 * JSON response format for a "404 Not Found" error.
 * 
 * @example {
 *  "status": 404,
 *  "error": {}
 * }
 */
export interface NotFoundErrorResponse extends BaseErrorResponse {
    status: 404,
}

/**
 * JSON response format for a "409 Conflit" error.
 * 
 * @example {
 *  "status": 409,
 *  "error": {}
 * }
 */
export interface ConflitErrorResponse extends BaseErrorResponse {
    status: 409,
}

/**
 * JSON response format for a "500 Internal Server Error" error.
 * 
 * @example {
 *  "status": 500,
 *  "error": {}
 * }
 */
export interface ServerErrorResponse extends BaseErrorResponse {
    status: 500,
}
