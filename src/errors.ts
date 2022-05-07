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

const FORBIDDEN: APIError = {
    code: 403,
    name: "forbidden",
    description: "Not enough permissions for this action."
}

const UNAUTHORIZED: APIError = {
    code: 401,
    name: "unauthorized",
    description: "Must be authenticated for this action."
}

const SEARCH_SALES_INVALID_LIMIT: APIError = {
    code: 4000000,
    name: "search_sales_invalid_limit", 
    description: "'limit' parameter must be an integer >= 1."
}

const SEARCH_SALES_INVALID_PAGE: APIError = {
    code: 4000001,
    name: "search_sales_invalid_page",
    description: "'page' parameter must be an integer >= 0."
}

const SEARCH_SALES_INVALID_DATESTART: APIError = {
    code: 4000002,
    name: "search_sales_invalid_dateStart",
    description: "'dateStart' parameter must be a date."
}

const SEARCH_SALES_INVALID_DATEEND: APIError = {
    code: 4000003,
    name: "search_sales_invalid_dateEnd",
    description: "'dateEnd' parameter must be a date."
}

const CREATE_SALES_INVALID_PRICE: APIError = {
    code: 4000004,
    name: "create_sales_invalid_price",
    description: "'totalPrice' parameter must be an real number >= 0."
}

const CREATE_SALES_INVALID_PRODUCT: APIError = {
    code: 4000005,
    name: "create_sales_invalid_product",
    description: "Items of 'list' must have a 'product' property."
}

const CREATE_SALES_INVALID_LOCATION: APIError = {
    code: 4000006,
    name: "create_sales_invalid_location",
    description: "Items of 'list' must have a 'location' property."
}

const CREATE_SALES_INVALID_QUANTITY: APIError = {
    code: 4000007,
    name: "create_sales_invalid_quantity",
    description: "Items of 'list' must have a 'quantity' property."
}

const SEARCH_USERS_INVALID_ROLE: APIError = {
    code: 4000008,
    name: "search_user_invalid_role",
    description: "'role' must be 'admin', 'seller' or 'common'."
}

const CREATE_USER_INVALID_EMAIL: APIError = {
    code: 4000009,
    name: "create_user_invalid_email",
    description: "'email' must be a valid email."
}

export const ERRORS = {
    INTERNAL_SERVER_ERROR,
    FORBIDDEN,
    UNAUTHORIZED,
    SEARCH_SALES_INVALID_LIMIT,
    SEARCH_SALES_INVALID_PAGE,
    SEARCH_SALES_INVALID_DATESTART,
    SEARCH_SALES_INVALID_DATEEND,
    CREATE_SALES_INVALID_PRICE,
    CREATE_SALES_INVALID_PRODUCT,
    CREATE_SALES_INVALID_LOCATION,
    CREATE_SALES_INVALID_QUANTITY,
    SEARCH_USERS_INVALID_ROLE,
    CREATE_USER_INVALID_EMAIL

}