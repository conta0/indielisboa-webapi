import { Controller, Tags, Route, Get, Post, Query, Body, SuccessResponse, Response, } from "tsoa";

/**
 * Information about a point of sale.
 * 
 * @example {
 *  "locationId": "location-1",
 *  "address": "Location 1"
 * }
 */
export interface Location {
    locationId: string,
    address: string,
}

/**
 * Information about a sold product.
 * 
 * @example {
 *  "productId": "product-1",
 *  "locationId": "location-1",
 *  "quantity": 5,
 *  "price": 10
 * }
 * */
export interface SaleItem {
    productId: string,
    locationId: string,
    /** @isInt @minimum 1 */
    quantity: number,
    /** @minimum 0 */
    price?: number
}

/**
 * Information about a sale.
 * 
 * @example {
 *  "saleId": "sale-1",
 *  "date": "2022-12-31T00:00:00Z",
 *  "sellerId": "user-1",
 *  "totalPrice": 50,
 *  "list": [
 *      {
 *          "productId": "product-1",
 *          "locationId": "location-1",
 *          "quantity": 5,
 *          "price": 10
 *      }
 *  ]
 * }
*/
export interface Sale {
    saleId: string,
    /** @isDateTime */
    date: string,
    sellerId: string,
    totalPrice: number,
    list: SaleItem[]
}

/**
 * Information necessary to create a new sale.
 * 
 * @example {
 *  "sellerId": "user-1",
 *  "list": [
 *      {
 *          "productId": "product-1",
 *          "locationId": "location-1",
 *          "quantity": 5
 *      }
 *  ]
 * }
 */
interface CreateSaleParams {
    sellerId: string,
    list: CreateSaleItemParams[]
}

interface CreateSaleItemParams {
    productId: string,
    locationId: string,
    /**
     * @isInt Must be an integer >= 1. 
     * @minimum 1 Minimum 1
     */
    quantity: number
}

export interface User {
    userId: string,
    email: string,
    name: string,
    role: Role
}

export enum Tag {
    PRODUCT = "Products",
    LOCATION = "Locations",
    SALE = "Sales",
    USER = "Users"
}

enum Role {
    "ADMIN" = "admin",
    "SELLER" = "seller",
    "NONE" = "none",
}

const ROLE_VALUE: object = {
    [Role.ADMIN]: 0b11,
    [Role.SELLER]: 0b01,
    [Role.NONE]: 0b00
};

@Route("sales")
export class SaleController extends Controller {
    /**
     * When a parameter is present, only sales with an **exact** match will be returned.
     * 
     * @summary Get a list of past sales. You may specify search parameters.
     * 
     * @param limit Limit the number of sales that are returned.
     * @isInt limit Must be an integer >= 1.
     * @minimum limit 1 minimum 1.
     * @example limit 10
     * 
     * @param page Used for pagination. When limit is present,
     * chunks of sales will be skipped (e.g. if page=5 and limit=10, the first 50 sales will be skipped).
     * @isInt page Must be an integer >= 0.
     * @minimum page 0 minimum 0.
     * @example page 0
     * 
     * @param startDate Sales after this date (inclusive).
     * @isDateTime startDate Must be a datetime (UTC format).
     * @example startDate "2022-01-01T00:00:00Z"
     * 
     * @param endDate Sales before this date (inclusive).
     * @isDateTime endDate Must be a datetime (UTC format).
     * @example endDate "2022-12-31T00:00:00Z"
     * 
     * @param sellerId Sales by this seller.
     * @example sellerId "user-1"
     * 
     * @param productId Sales with this product.
     * @example productId "product-1"
     * 
     * @param locationId Sales at this location.
     * @example locationId "location-1"
     */
    @Get()
    @Tags(Tag.SALE)
    @SuccessResponse("200", "Successfully returned a list of sales.")
    @Response<ValidationError>("400", "Bad Request", {
        status: 400,
        error: {
            fields: {
                limit: {
                    message: "minimum 1",
                    value: "0"
                }
            }
        }
    })
    @Response<AuthenticationError>("401", "Unauthorized")
    @Response<AuthorizationError>("403", "Forbidden")
    @Response<InternalServerError>("500", "Internal Server Error")
    public async getSales(
        @Query() limit?: number,
        @Query() page?: number,
        @Query() startDate?: Date,
        @Query() endDate?: Date,
        @Query() sellerId?: string,
        @Query() productId?: string,
        @Query() locationId?: string
    ): Promise<SearchSalesResult> {
        return {
            status: 200,
            data: {
                sales: []
            }
        };
    }

    /** 
     * @summary Create a new sale
     */
    @Post()
    @Tags(Tag.SALE)
    @SuccessResponse("201", "Successfully created a new sale.")
    @Response<ValidationError>("400", "Bad Request", {
        status: 400,
        error: {
            fields: {
                "body.sellerId": {
                    message: "invalid string value",
                    value: 1
                }
            }
        }
    })
    @Response<AuthenticationError>("401", "Unauthorized")
    @Response<AuthorizationError>("403", "Forbidden")
    @Response<InternalServerError>("500", "Internal Server Error")
    public async postSale(
        @Body() body: CreateSaleParams
    ): Promise<CreateSaleResult> {
        return {
            status: 201,
            data: {
                sale: {
                    saleId: "sale-1",
                    date: "2022-12-31T00:00:00Z",
                    sellerId: "user-1",
                    totalPrice: 50,
                    list: []
                }
            }
        };
    }
}

export interface InternalServerError {
    status: 500,
    error: {}
}

export interface ValidationError {
    status: 400,
    error: {
        message?: string,
        fields?: {
            [key: string]: {
                message: string,
                value: string | number,
            }
        }
    }
}

export interface SearchSalesResult {
    status: 200,
    data: {
        sales: Sale[]
    }
}

export interface AuthenticationError {
    status: 401,
    error: {}
}

export interface AuthorizationError {
    status: 403,
    error: {}
}

export interface CreateSaleResult {
    status: 201,
    data: {
        "sale": Sale
    }
}
