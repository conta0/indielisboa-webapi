export type APIError = {
    code: number,
    name: string,
    description: string
}

const INTERNAL_SERVER_ERROR: APIError = {
    code: 500,
    name: "internal_server_error",
    description: "Unspecified error. Something went wrong."
}

const FORBIDDEN_ERROR: APIError = {
    code: 403,
    name: "forbidden",
    description: "Not enough permissions for this action."
}

const UNAUTHORIZED_ERROR: APIError = {
    code: 401,
    name: "unauthorized",
    description: "Must be authenticated for this action."
}

const SALES_INVALID_LIMIT: APIError = {
    code: 4000000,
    name: "sales_invalid_limit", 
    description: "'limit' parameter must be an integer >= 1."
}

const SALES_INVALID_PAGE: APIError = {
    code: 4000001,
    name: "sales_invalid_page",
    description: "'page' parameter must be an integer >= 0."
}

const SALES_INVALID_DATESTART: APIError = {
    code: 4000002,
    name: "sales_invalid_dateStart",
    description: "'dateStart' parameter must be a date."
}

const SALES_INVALID_DATEEND: APIError = {
    code: 4000003,
    name: "sales_invalid_dateEnd",
    description: "'dateEnd' parameter must be a date."
}

export const ERRORS = {
    INTERNAL_SERVER_ERROR,
    FORBIDDEN_ERROR,
    UNAUTHORIZED_ERROR,
    SALES_INVALID_LIMIT,
    SALES_INVALID_PAGE,
    SALES_INVALID_DATESTART,
    SALES_INVALID_DATEEND
}