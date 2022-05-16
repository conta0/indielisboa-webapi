import { Controller, Tags, Route, Get, Post, Query, Body, SuccessResponse, Response, Res, TsoaResponse, } from "tsoa";
import { SalesService } from "./salesService";
import { Sale, SaleItem } from "../model/sales";
import { CreateSaleParams, CreateSaleItemParams } from "./salesDtos";
import { BadRequestError, AuthenticationError, AuthorizationError, ServerError, NotFoundError } from "../common/interfaces";

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


const salesService = new SalesService();

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
    @Response<BadRequestError>("400", "Bad Request", {
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
    @Response<ServerError>("500", "Internal Server Error")
    public async getSales(
        @Query() limit?: number,
        @Query() page?: number,
        @Query() startDate?: Date,
        @Query() endDate?: Date,
        @Query() sellerId?: string,
        @Query() productId?: string,
        @Query() locationId?: string
    ): Promise<SearchSalesResult> {
        const sales = salesService.getSales();
        return {
            status: 200,
            data: {
                sales: sales
            }
        };
    }

    /** 
     * @summary Create a new sale
     */
    @Post()
    @Tags(Tag.SALE)
    @SuccessResponse("201", "Successfully created a new sale.")
    @Response<BadRequestError>("400", "Bad Request", {
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
    @Response<ServerError>("500", "Internal Server Error")
    public async postSale(
        @Body() body: CreateSaleParams,
        @Res() notFoundResponse: TsoaResponse<404, NotFoundError>
    ): Promise<Sale> {
        const result: any = salesService.createSale(body);
        
        // Handle Error
        if (result.error) {
            return notFoundResponse(404, {status:404, error: {}});
        }
        
        return result;
    }
}

export interface SearchSalesResult {
    status: 200,
    data: {
        sales: Sale[]
    }
}

export interface CreateSaleResult {
    status: 201,
    data: {
        sale: Sale
    }
}