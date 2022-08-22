import { Body, Controller, Get, Post, Query, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import { Role } from "../common/roles";
import { AuthRequest, SecurityScheme } from "../security/authorization";
import { SaleItem } from "./saleItemModel";
import { Sale, SaleStatus } from "./saleModel";
import { UUID } from "../common/types";
import { Stock } from "../products/stockModel";
import { InferAttributes, Op, Transaction } from "sequelize";
import { BadRequestError, ConflitError, AppErrorCode, BadRequestErrorResponse, AuthenticationErrorResponse, ForbiddenErrorResponse, ServerErrorResponse, ConflitErrorResponse } from "../common/errors";

const DEFAULT_START_DATE: Date = new Date(2022, 1, 1);
const DEFAULT_END_DATE: Date = new Date(2023, 1, 1);

const TAG_SALES = "Sales";

@Route("sales")
export class SaleController extends Controller {
    /**
     * The returned sales list will be ordered by date (asceding).
     * Each item in the list will contain the entire sale info.
     * If a search criteria is applied, only sales with an **exact** match will be returned.
     * 
     * @summary Get a list of sales. You may specify search parameters.
     * 
     * @param limit Limit the number of sales returned. Minimum 1.
     * @isInt limit Must be an integer >= 1.
     * @minimum limit 1 minimum 1.
     * 
     * @param page Used for pagination. When limit is used,
     * chunks of sales will be skipped (e.g. if page=5 and limit=10, the first 50 sales will be skipped).
     * @isInt page Must be an integer >= 0.
     * @minimum page 0 minimum 0.
     * 
     * @param startDate Sales after this date (inclusive). Use UTC format, time is optional.
     * @isDate startDate Must be a date like 'YYYY-MM-DD'.
     * 
     * @param endDate Sales before this date (inclusive). Use UTC format, time is optional.
     * @isDate endDate Must be a date like 'YYYY-MM-DD'.
     * 
     * @param sellerId Sales by this seller.
     * 
     * @param productId Sales with this product.
     * 
     * @param locationId Sales at this location.
     */
    @Get()
    @Tags(TAG_SALES)
    @Security(SecurityScheme.JWT, [Role.MANAGER])
    @SuccessResponse(200, "Successfully returned a list of sales.")
    @Response<BadRequestErrorResponse>(400, "Bad Request", {
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
    @Response<AuthenticationErrorResponse>(401, "Not Authenticated.")
    @Response<ForbiddenErrorResponse>(403, "Not Authorized.")
    @Response<ServerErrorResponse>(500, "Internal Server Error.")
    public async getSales(
        @Query() limit: number = 10,
        @Query() page: number = 0,
        @Query() startDate: Date = DEFAULT_START_DATE,
        @Query() endDate: Date = DEFAULT_END_DATE,
        @Query() productId?: UUID,
        @Query() sellerId?: UUID,
        @Query() locationId?: UUID
    ): Promise<SearchSalesResult> {
        // Sanity check. Don't allow startDate to be greater than endDate
        if (startDate > endDate) {
            return Promise.reject(new BadRequestError({
                message: "Bad dates.",
                code: AppErrorCode.REQ_FORMAT,
                fields: {
                    "startDate": {
                        message: "startDate can't be greater than endDate",
                        value: startDate
                    },
                    "endDate": {
                        message: "endDate can't be less than startDate",
                        value: endDate
                    }
                }
            }));
        }

        // Find sales
        const result = await Sale.findAll({
            limit: limit, 
            offset: page * limit, 
            where: {
                updatedAt: {
                    [Op.gte]: startDate,
                    [Op.lte]: endDate
                },
                ...(sellerId) ? {sellerId: sellerId} : {},
                ...(locationId) ? {locationId: locationId} : {}
            }, 
            include: [
                {
                    association: Sale.associations.items1,
                    attributes: [],
                    where: {
                        ...(productId) ? {productId: productId} : {}
                    },
                },
                {
                    association: Sale.associations.items2
                }
            ],
            order: [["updatedAt", "asc"]],
        });

        const sales = result.map(toSaleInfo);

        return {
            status: 200,
            data: sales
        };
    }

    /** 
     * Creates a sale with the "Completed" status.
     * 
     * @summary Create a new sale.
     */
     @Post()
     @Tags(TAG_SALES)
     @Security(SecurityScheme.JWT, [Role.SELLER])
     @SuccessResponse(201, "Successfully created a new sale.")
     @Response<BadRequestErrorResponse>(400, "Bad Request")
     @Response<AuthenticationErrorResponse>(401, "Not Authenticated.")
     @Response<ForbiddenErrorResponse>(403, "Not Authorized.")
     @Response<ConflitErrorResponse>(409, "Can't create sale.")
     @Response<ServerErrorResponse>(500, "Internal Server Error.")
     public async createSale(
        @Request() request: AuthRequest,
        @Body() body: CreateSaleParams,
     ): Promise<CreateSaleResult> {
        const { list, locationId } = body;
        const productIds: UUID[] = list.map(item => item.productId);
        const sellerId: UUID = request.auth.userId;

        // Sanity check. Don't allow duplicate values
        if (productIds.some((id, idx) => productIds.lastIndexOf(id) != idx)) {
            return Promise.reject(new BadRequestError({
                code: AppErrorCode.REQ_FORMAT,
                message: "Repeated productId not allowed."
            }));
        }
        
        // Begin a Repeatable Read transaction.
        // Big wall of business logic incoming!
        const result = await Stock.sequelize!!.transaction(
            {isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ},
            async(transaction) => {
                // Find all products in the list and at this location.
                const stockResult: Stock[] = await Stock.findAll({
                    raw: true,
                    where: { productId: productIds, locationId: locationId },
                    transaction,
                });

                // Verify if every product exists and has enough quantity in stock.
                const valid: boolean = list.every(item => {
                    const stock = stockResult.find(p => p.productId == item.productId);
                    if (stock == null || stock.quantity < item.quantity) return false;

                    // Let's update the stock here and save them later all at once.
                    stock.quantity -= item.quantity;
                    return true;
                });

                // Abort the transaction now.
                if (!valid) {
                    return null;
                }

                // Go ahead and create a new sale.
                const sale: Sale = await Sale.create({
                    status: SaleStatus.COMPLETED,
                    sellerId: sellerId,
                    locationId: locationId,
                }, {transaction});

                // Now add the list of products.
                const saleId: UUID = sale.saleId;
                const items: InferAttributes<SaleItem>[] = list.map(item => ({
                    saleId: saleId, 
                    productId: item.productId, 
                    quantity: item.quantity
                }));
                
                // Create sale list
                await SaleItem.bulkCreate(items, {transaction});

                // Update stock
                await Stock.bulkCreate(stockResult, {transaction, updateOnDuplicate: ["quantity"]});

                return saleId;
            }
        );

        if (result == null) {
            return Promise.reject(new ConflitError({
                message: "Can't create sale. Either a product doesn't exist or doesn't have enough stock at this location."
            }))
        }

        return {
            status: 201,
            data: result
        };
    }
}

// ------------------------------ Helper Functions ------------------------------ // 

/**
 * Takes a Sale object and formats it to a SaleInfo object.
 * 
 * @param sale The Sale object.
 * @returns The sale formatted as a SaleInfo object.
 */
function toSaleInfo(sale: Sale): SaleInfo {
    const items: SaleListItem[] = sale.items2?.map(item => ({
        productId: item.productId,
        quantity: item.quantity
    })) || [];

    return {
        saleId: sale.saleId,
        customerId: sale.customerId,
        sellerId: sale.sellerId,
        locationId: sale.locationId,
        status: sale.status,
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
        items: items,
    }
}

// ------------------------------ Request Formats ------------------------------ //

interface SaleListItem {
    productId: UUID,
    /** @isInt @minimum 1 minimum 1. */
    quantity: number,
}

/** JSON request format for the "POST /sales" endpoint. */
interface CreateSaleParams {
    locationId: UUID,
    list: SaleListItem[]
}

// ------------------------------ Response Formats ------------------------------ //

interface SaleInfo {
    saleId: UUID,
    customerId: UUID,
    sellerId: UUID,
    locationId: UUID,
    status: SaleStatus,
    createdAt: Date,
    updatedAt: Date,
    items: SaleListItem[],
}

/** JSON response format for the "GET /sales" endpoint. */
export interface SearchSalesResult {
    status: 200,
    data: SaleInfo[]
}

/** JSON response format for the "POST /sales" endpoint. */
export interface CreateSaleResult {
    status: 201,
    data: UUID
}