import { Body, Controller, Get, Patch, Path, Post, Query, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import { SequelizeTransactionCallback, UUID } from "../common/types";
import { Role } from "../common/roles";
import { SecurityScheme } from "../security/authorization";
import { TshirtColour, TshirtSize } from "./categories/tshirtModel";
import { BagColour } from "./categories/bagModel";
import { Product } from "./productModel";
import { ForeignKeyConstraintError, Includeable, InferCreationAttributes, Model, Op, Order, OrderItem, Transaction, UniqueConstraintError, WhereOptions } from "sequelize";
import { BadRequestError, ConflitError, AppErrorCode, NotFoundError, AppError, BadRequestErrorResponse, ServerErrorResponse, NotFoundErrorResponse, AuthenticationErrorResponse, ForbiddenErrorResponse, ConflitErrorResponse } from "../common/errors";
import { ProductCategory } from "./types";
import { Stock } from "./stockModel";

// ------------------------------ Types ------------------------------ //

// Stock below or equal to this value is considered "LAST"
const STOCK_THRESHOLD = 3;

// The possible product's Status
enum ProductStatus {
    STOCK = "in stock",
    LAST = "last units",
    SOLD_OUT = "sold out",
    NO_INFO = "no info",
}

// To order products. The values themselves are just for documentation.
enum ProductOrder {
    PRICE_ASC = "product.price.asc",
    PRICE_DSC = "product.price.desc",
    NAME_ASC = "product.name.asc",
    NAME_DSC = "product.name.desc",
}

// Maps a ProductOrder into a Sequelize OrderItem
const ProductOrderMapper = {
    [ProductOrder.PRICE_ASC]: ["price", "asc"] as OrderItem,
    [ProductOrder.PRICE_DSC]: ["price", "desc"] as OrderItem,
    [ProductOrder.NAME_ASC]: ["name", "asc"] as OrderItem,
    [ProductOrder.NAME_DSC]: ["name", "desc"] as OrderItem,
}

/** 
 * @minimum 0 mininum 0.
 * @maximum 2000 maximum 2000.
 */
type Price = number;

const TAG_PRODUCTS = "Products";

@Route("products")
export class ProductsController extends Controller {
    /**
     * If a search criteria is applied, only products with an **exact** match will be returned.
     * When applicable, if a search parameter has multiple values, returned products will match at least one of those values.
     * 
     * @summary Retrieve a list of products. You may specify a search criteria.
     * 
     * @param limit Limit the number of products returned.
     * @isInt limit Must be an integer >= 1.
     * @minimum limit 1 minimum 1.
     * 
     * @param page Used for pagination. When limit is used,
     * chunks of products will be skipped (e.g. if page=5 and limit=10, the first 50 products will be skipped).
     * @isInt page Must be an integer >= 0.
     * @minimum page 0 minimum 0.
     * 
     * @param priceMin Minimum product price, inclusive (minimum 0).
     * 
     * @param priceMax Maximum product price, inclusive (maximum 2000).
     * 
     * @param stock Filter by product's availability. If true, only returns products with available stock.
     * 
     * @param category Filter by the product's category.
     * 
     * @param order How to order the results. 
     */
    @Get()
    @Tags(TAG_PRODUCTS)
    @SuccessResponse(200, "Successfully returned a list of products.")
    @Response<BadRequestErrorResponse>(400, "Bad Request.")
    @Response<ServerErrorResponse>(500, "Internal Server Error.")
    public async getProducts(
        @Query() limit: number = 10,
        @Query() page: number = 0,
        @Query() priceMin: Price = 0,
        @Query() priceMax: Price = 2000,
        @Query() stock: boolean = false,
        @Query() category?: ProductCategory,
        @Query() order?: ProductOrder,
    ): Promise<GetProductsResult> {
        // Where filter
        const where: WhereOptions = {
            price: {
                [Op.gte]: priceMin,
                [Op.lte]: priceMax
            }
        }

        // If the request wants products in stock, minimum stock is 1. 
        const minStock = (stock) ? 1 : 0;
        const include: Includeable = {
            required: stock,
            association: Product.associations.stock,
            attributes: ["quantity"],
            where: {
                quantity: {
                    [Op.gte]: minStock
                }
            }
        };

        // Category special case
        if (category != null) {
            where.category = category
        }

        // Order by
        const orderBy: Order = [];
        if (order != null) {
            orderBy.push(ProductOrderMapper[order as keyof typeof ProductOrderMapper]);
        }

        // Fetch products
        const result = await Product.findAll({limit: limit, offset: page * limit, where, include, order: orderBy});
        const products: ProductPublicInfo[] = result.map(p => toProductPublicInfo({product: p, tags: null}));
        
        return {
            status: 200,
            data: products
        }
    }

    /**
     * Retrieves the publicly available information of a product.
     * 
     * @summary Retrieve a product's public information.
     * 
     * @param productId The products's unique identifier.
     */
    @Get("{productId}")
    @Tags(TAG_PRODUCTS)
    @SuccessResponse(200, "Successfully returned the product's public information.")
    @Response<BadRequestErrorResponse>(400, "Invalid product identifier.")
    @Response<NotFoundErrorResponse>(404, "Product not found.")
    @Response<ServerErrorResponse>(500, "Internal Server Error.")
    public async getProductPublicInfo(
        @Path() productId: UUID,
    ) : Promise<GetProductPublicInfoResult> {
        
        // Fetch the product and its tags
        const result = await transactionRepeatableRead(async(t) => await getProductByPk(productId, t));
        
        // Product not found
        if (result == null) return Promise.reject(new NotFoundError());

        const publicInfo: ProductPublicInfo = toProductPublicInfo(result);

        return {
            status: 200,
            data: publicInfo
        }
    }

    /**
     * Retrieves the protected information of a product and its list of locations (stock).
     * Each location in this list has its unique identifier and its address.
     * 
     * @summary Retrieve a product's protected information.
     * 
     * @param productId The products's unique identifier.
     */
    @Get("{productId}/protected")
    @Tags(TAG_PRODUCTS)
    @Security(SecurityScheme.JWT, [Role.SELLER])
    @SuccessResponse(200, "Successfully returned the product's protected information.")
    @Response<BadRequestErrorResponse>(400, "Invalid product identifier.")
    @Response<NotFoundErrorResponse>(404, "Product not found.")
    @Response<AuthenticationErrorResponse>(401, "Not Authenticated.")
    @Response<ForbiddenErrorResponse>(403, "Not Authorized.")
    @Response<ServerErrorResponse>(500, "Internal Server Error.")
    public async getProductProtectedInfo(
        @Path() productId: UUID,
    ) : Promise<GetProductProtectedInfoResult> {
        
        // Fetch the product and its tags
        const result = await transactionRepeatableRead(async(t) => await getProductByPk(productId, t));
        
        // Product not found
        if (result == null) return Promise.reject(new NotFoundError());

        const protectedInfo: ProductProtectedInfo = toProductProtectedInfo(result);

        return {
            status: 200,
            data: protectedInfo
        }
    }

    /**
     * @summary Creates a new Tshirt.
     */
     @Post("tshirts")
     @Tags(TAG_PRODUCTS)
     @Security(SecurityScheme.JWT, [Role.MANAGER])
     @SuccessResponse(201, "Successfully created a new Tshirt.")
     @Response<BadRequestErrorResponse>(400, "Bad Request.")
     @Response<AuthenticationErrorResponse>(401, "Not Authenticated.")
     @Response<ForbiddenErrorResponse>(403, "Not Authorized.")
     @Response<ConflitErrorResponse>(409, "Can't create tshirt.")
     @Response<ServerErrorResponse>(500, "Internal Server Error.")
     public async createTshirt(
         @Body() body: CreateTshirtParams
     ) : Promise<CreateProductResult> {
        const { size,  colour, design } = body;

        try {
            const productId = await transactionReadCommitted(async(t) => {
                const product = await createProduct(body, ProductCategory.TSHIRT, t);
                await product.createTshirt({size, colour, design}, {transaction: t});
                return product.productId;
            });

            return {
                status: 201,
                data: productId
            }
        } catch (err) {
            if (err instanceof UniqueConstraintError) {
                return Promise.reject(new ConflitError({
                    message: "The tshirt already exists. The combination of tags must be unique."
                }));
            }
            return Promise.reject(err);
        }
        
     }

    /**
     * @summary Creates a new Bag.
     */
    @Post("bags")
    @Tags(TAG_PRODUCTS)
    @Security(SecurityScheme.JWT, [Role.MANAGER])
    @SuccessResponse(201, "Successfully created a new Bag.")
    @Response<BadRequestErrorResponse>(400, "Bad Request.")
    @Response<AuthenticationErrorResponse>(401, "Not Authenticated.")
    @Response<ForbiddenErrorResponse>(403, "Not Authorized.")
    @Response<ConflitErrorResponse>(409, "Can't create bag.")
    @Response<ServerErrorResponse>(500, "Internal Server Error.")
    public async createBag(
        @Body() body: CreateBagParams
    ) : Promise<CreateProductResult> {
        const { design, colour } = body;

        try {
            const productId = await transactionReadCommitted(async(t) => {
                const product = await createProduct(body, ProductCategory.BAG, t);
                await product.createBag({colour, design}, {transaction: t});
                return product.productId;
            });

            return {
                status: 201,
                data: productId
            }
        } catch (err) {
            if (err instanceof UniqueConstraintError) {
                return Promise.reject(new ConflitError({
                    message: "The bag already exists. The combination of tags must be unique."
                }));
            }
            return Promise.reject(err);
        }
    }

    /**
     * @summary Creates a new Book.
     */
    @Post("books")
    @Tags(TAG_PRODUCTS)
    @Security(SecurityScheme.JWT, [Role.MANAGER])
    @SuccessResponse(201, "Successfully created a new Book.")
    @Response<BadRequestErrorResponse>(400, "Bad Request.")
    @Response<AuthenticationErrorResponse>(401, "Not Authenticated.")
    @Response<ForbiddenErrorResponse>(403, "Not Authorized.")
    @Response<ConflitErrorResponse>(409, "Can't create book.")
    @Response<ServerErrorResponse>(500, "Internal Server Error.")
    public async createBook(
        @Body() body: CreateBookParams
    ) : Promise<CreateProductResult> {
        const { title, author, publisher, year } = body;

        try {
            const productId = await transactionReadCommitted(async(t) => {
                const product = await createProduct(body, ProductCategory.BAG, t);
                await product.createBook({title, author, publisher, year}, {transaction: t});
                return product.productId;
            });
            
            return {
                status: 201,
                data: productId
            }
        } catch (err) {
            if (err instanceof UniqueConstraintError) {
                return Promise.reject(new ConflitError({
                    message: "The book already exists. The combination of tags must be unique."
                }));
            }
            return Promise.reject(err);
        }
    }

    /**
     * Update a products information, except its tags and category.
     * Returns the updated product.
     * 
     * @summary Update a product's protected information.
     * 
     * @param productId The product's unique identifier.
     */
    @Patch("{productId}/protected")
    @Tags(TAG_PRODUCTS)
    @Security(SecurityScheme.JWT, [Role.MANAGER])
    @SuccessResponse(200, "Successfully updated the product.")
    @Response<BadRequestErrorResponse>(400, "Bad Request.")
    @Response<AuthenticationErrorResponse>(401, "Not Authenticated.")
    @Response<ForbiddenErrorResponse>(403, "Not Authorized.")
    @Response<ServerErrorResponse>(500, "Internal Server Error.")
    public async updateProduct(
        @Path() productId: UUID,
        @Body() body: UpdateProductParams
    ) : Promise<UpdateProductResult> {
        const { name, price, description, active } = body;

        const result = await transactionRepeatableRead(async (t) => {
            const result = await getProductByPk(productId);
            if (result == null) {
                return null;
            }
            const product = result.product;
            await product.update({name, price, description, active});
            return result;
        });

        // Product not found
        if (result == null) {
            return Promise.reject(new NotFoundError());
        }

        const protectedInfo = toProductProtectedInfo(result);

        return {
            status: 200,
            data: protectedInfo
        }
    }

    /**
     * Updates the stock of a product at multiple locations.
     * Existing stock in other locations won't be modified unless part of the update.
     * 
     * @summary Update the stock of a product.
     * 
     * @param productId The product's unique identifier.
     */
    @Patch("{productId}/stock")
    @Tags(TAG_PRODUCTS)
    @Security(SecurityScheme.JWT, [Role.MANAGER])
    @SuccessResponse(204, "Successfully updated stock.")
    @Response<BadRequestErrorResponse>(400, "Bad Request.")
    @Response<AuthenticationErrorResponse>(401, "Not Authenticated.")
    @Response<ForbiddenErrorResponse>(403, "Not Authorized.")
    @Response<NotFoundError>(404, "Product not found.")
    @Response<ConflitErrorResponse>(409, "Can't update stock.")
    @Response<ServerErrorResponse>(500, "Internal Server Error.")
    public async updateProductstock(
        @Path() productId: UUID,
        @Body() body: UpdateProductStockParams
    ) : Promise<void> {
        const { list } = body;
        const locations = list.map(item => item.locationId);

        // Sanity check. Don't allow repeated locationIds.
        if (locations.some((id, idx) => locations.lastIndexOf(id) != idx)) {
            return Promise.reject(new BadRequestError({
                code: AppErrorCode.REQ_FORMAT,
                message: "Repeated locationId not allowed."
            }));
        }

        const toUpsert: InferCreationAttributes<Stock>[] = list.map<InferCreationAttributes<Stock>>(stock => ({
            productId: productId,
            locationId: stock.locationId,
            quantity: stock.quantity
        }));

        try {
            const result = await Product.sequelize!!.transaction(
                {isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ},
                async(t) => {
                    const product = await Product.findByPk(productId, {transaction: t});

                    // Product not found
                    if (product == null) {
                        return new NotFoundError({
                            code: AppErrorCode.NOT_FOUND,
                            message: "Product not found.",
                            fields: {
                                "productId": {
                                    message: "This productId doesn't exist.",
                                    value: productId
                                }
                            }
                        });
                    }

                    await Stock.bulkCreate(toUpsert, {updateOnDuplicate: ["quantity"], transaction: t});
                }
            );

            // Reject errors
            if (result instanceof AppError) {
                return Promise.reject(result);
            }

        } catch (err) {
            // Error during upsert
            if (err instanceof ForeignKeyConstraintError) {
                return Promise.reject(new ConflitError({
                    message: "Can't update product's stock. Some locations don't exist."
                }));
            }
            throw err;
        }
    }
}

// ------------------------------ Helper Functions ------------------------------ //
/**
 * Starts a transaction with the "Repeatable Read" isolation level.
 * 
 * @param callback Callback for the transaction.
 * @returns A promise to be either resolved with the transaction result or rejected with an Error.
 */
async function transactionRepeatableRead<T>(callback: SequelizeTransactionCallback<T>): Promise<T> {
    return Product.sequelize!!.transaction({isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ}, callback);
}

/**
 * Starts a transaction with the "Read Committed" isolation level.
 * 
 * @param callback Callback for the transaction.
 * @returns A promise to be either resolved with the transaction result or rejected with an Error.
 */
 async function transactionReadCommitted<T>(callback: SequelizeTransactionCallback<T>): Promise<T> {
    return Product.sequelize!!.transaction({isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED}, callback);
}

interface ProductByPk {
    product: Product,
    tags: Model<any, any> | null
}

/**
 * Receives a Product's primary key and fetches that product from the database, alongside its stock and category tags.
 * 
 * @param productId The product's primary key.
 * @param transaction The trasanction
 * @returns A promise to be either resolved with the Product and its Tags or reject with an Error.
 */
async function getProductByPk(productId: Product["productId"], transaction?: Transaction): Promise<ProductByPk | null> {
    // Associate with Stock, even if the product has no assoaciton. Exclude its ID.
    const include: Includeable = {
        required: false,
        association: Product.associations.stock,
        attributes: ["locationId", "quantity"]
    };

    const product = await Product.findByPk(productId, {include, transaction: transaction});
    if (product == null) {
        return null;
    }
    
    const tags = await product.getCategoryTags(transaction);
    return { product, tags };
}

/**
 * Receives a product and transforms it into a view with protected info.
 * 
 * @param productAndTags The product to be processed.
 * @returns A product formatted with protected info.
 */
 function toProductProtectedInfo(productAndTags: ProductByPk): ProductProtectedInfo {
    const product: Product = productAndTags.product;
    const tags = productAndTags.tags?.toJSON<ProductCategoryTags>();

    const stock = product.stock?.map(s => ({locationId: s.locationId, quantity: s.quantity}));
    const totalStock = stock?.reduce((acc, entry) => acc + entry.quantity, 0);
    const status: ProductStatus = (!product.active || stock?.length == 0) ? 
        ProductStatus.NO_INFO : (totalStock!! == 0) ? 
        ProductStatus.SOLD_OUT : (totalStock!! <= STOCK_THRESHOLD) ? 
        ProductStatus.LAST : ProductStatus.STOCK;
    
    
    // Make formatted product
    const protectedInfo: ProductProtectedInfo = {
        productId: product.productId,
        name: product.name,
        description: product.description,
        price: product.price,
        status: status,
        category: product.category,
        tags: tags || null,
        active: product.active,
        stock: stock || [],
        totalStock: totalStock || 0,
    }

    return protectedInfo;
}

/**
 * Receives a product and transforms it into a view with only public info.
 * 
 * @param productAndTags The product to be processed.
 * @returns A product formatted with public info.
 */
function toProductPublicInfo(productAndTags: ProductByPk): ProductPublicInfo {
    const protectedInfo: ProductProtectedInfo = toProductProtectedInfo(productAndTags);
    const publicInfo: ProductPublicInfo = {
        productId: protectedInfo.productId,
        name: protectedInfo.name,
        description: protectedInfo.description,
        price: protectedInfo.price,
        status: protectedInfo.status,
        category: protectedInfo.category,
        tags: protectedInfo.tags,
    }
    return publicInfo;
}

async function createProduct(
    params: CreateProductParams,
    category: ProductCategory,
    transaction?: Transaction
): Promise<Product> {
    const { name, description, price } = params;
    return await Product.create({name, description, price, category}, {transaction: transaction});
}

// ------------------------------ Request Formats ------------------------------ //

interface CreateProductParams {
    name: string,
    description: string,
    price: Price,
}

interface CreateTshirtParams extends CreateProductParams {
    colour: TshirtColour,
    size: TshirtSize,
    design: string,
}

interface CreateBagParams extends CreateProductParams {
    colour: BagColour,
    design: string,
}

interface CreateBookParams extends CreateProductParams {
    title: string,
    author: string,
    publisher: string,
    year: string,
}

interface UpdateProductParams {
    name?: string,
    description?: string,
    price?: Price,
    active?: boolean,
}

interface ProductStock {
    locationId: UUID,
    quantity: number,
}

interface UpdateProductStockParams {
    list: ProductStock[]
}

// ------------------------------ Response Formats ------------------------------ //

// TSOA doesn't like "object", so this is a workaround.
interface ProductCategoryTags {
    [name: string]: string
}

interface ProductStockInfo {
    locationId: UUID,
    quantity: number,
}

// TODO images
interface ProductProtectedInfo {
    productId: UUID,
    name: string,
    description: string,
    price: number,
    status: ProductStatus,
    //images: string[],
    category: ProductCategory,
    /** @example null */
    tags: ProductCategoryTags | null,
    stock: ProductStockInfo[],
    totalStock: number,
    active: boolean,
}

// Public info is the same as protected info, except a few properties.
type ProductPublicInfo = Omit<ProductProtectedInfo, "active" | "stock" | "totalStock">

/** JSON response format for the "GET /products" endpoint. */
interface GetProductsResult {
    status: 200,
    data: ProductPublicInfo[]
}

/** JSON response format for the "GET /products/{productId}" endpoint. */
interface GetProductPublicInfoResult {
    status: 200,
    data: ProductPublicInfo
}

/** JSON response format for the "GET /products/{productId}/protected" endpoint. */
interface GetProductProtectedInfoResult {
    status: 200,
    data: ProductProtectedInfo
}

/** JSON response format for the "POST /products/{category}" endpoint. */
interface CreateProductResult {
    status: 201,
    data: UUID,
}

/** JSON response format for the "PATCH /products/{productId}" endpoint. */
interface UpdateProductResult {
    status: 200,
    data: ProductProtectedInfo
}
