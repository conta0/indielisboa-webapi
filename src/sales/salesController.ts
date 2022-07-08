import { Body, Controller, Get, Post, Query, Res, Response, Route, Security, SuccessResponse, Tags, TsoaResponse, } from "tsoa";
import { AuthenticationErrorResponse, AuthorizationErrorResponse, BadRequestErrorResponse, NotFoundErrorResponse, ServerErrorResponse } from "../common/responses";
import { Sale, SaleItem } from "../model/sales";
import { Role, SecurityScheme } from "../security/authorization";
import { CreateSaleParams, CreateSaleItemParams } from "./salesDtos";
import { SalesService } from "./salesService";

const TAG_SALES = "Sales";
const salesService = new SalesService();

@Route("sales")
export class SaleController extends Controller {
    /**
     * If a search criteria is applied, only sales with an **exact** match will be returned.
     * 
     * @summary Get a list of past sales. You may specify search parameters.
     * 
     * @param limit Limit the number of sales returned.
     * @isInt limit Must be an integer >= 1.
     * @minimum limit 1 minimum 1.
     * @example limit 10
     * 
     * @param page Used for pagination. When limit is used,
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
    @Tags(TAG_SALES)
    @Security(SecurityScheme.JWT, [Role.MANAGER])
    @SuccessResponse("200", "Successfully returned a list of sales.")
    @Response<BadRequestErrorResponse>("400", "Bad Request", {
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
    @Response<AuthenticationErrorResponse>("401", "Unauthorized")
    @Response<AuthorizationErrorResponse>("403", "Forbidden")
    @Response<ServerErrorResponse>("500", "Internal Server Error")
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
     * @summary Create a new sale.
     */
    @Post()
    @Tags(TAG_SALES)
    @Security(SecurityScheme.JWT, [Role.SELLER])
    @SuccessResponse("201", "Successfully created a new sale.")
    @Response<BadRequestErrorResponse>("400", "Bad Request", {
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
    @Response<AuthenticationErrorResponse>("401", "Unauthorized")
    @Response<AuthorizationErrorResponse>("403", "Forbidden")
    @Response<ServerErrorResponse>("500", "Internal Server Error")
    public async postSales(
        @Body() body: CreateSaleParams,
        @Res() notFoundResponse: TsoaResponse<404, NotFoundErrorResponse>
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