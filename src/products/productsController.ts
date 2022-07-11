import { Body, Controller, Get, Patch, Path, Query, Route, Security, Tags } from "tsoa";
import { ProductCategory, UUID } from "../common/model";
import { Role } from "../common/roles";
import { SecurityScheme } from "../security/authorization";
import { Tshirt } from "./categories/tshirtModel";
import { Bag } from "./categories/bagModel";
import { Book } from "./categories/bookModel";
import { Product } from "./productModel";
import { Includeable, Op, Transaction, WhereOptions } from "sequelize";
import { NotFoundError } from "../common/errors";

// Stock below or equal to this value is considered "LAST"
const STOCK_THRESHOLD = 3;

enum ProductStatus {
    STOCK = "in stock",
    LAST = "last units",
    SOLD_OUT = "sold out",
    NO_INFO = "no info",
}

const TAG_PRODUCTS = "Products";

@Route("products")
export class ProductsController extends Controller {
    /**
     * If a search criteria is applied, only products with an exact match will be returned.
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
     * @param priceMin Minimum product price (inclusive).
     * @minimum priceMin 0 minimum 0.
     * 
     * @param priceMax Maximum product price (inclusive).
     * @maximum priceMax 2000 maximum 2000.
     * 
     * @param stock Product availability. If true, only returns products with available stock.
     * 
     * @param category Product category.
     */
    @Get()
    @Tags(TAG_PRODUCTS)
    public async getProducts(
        @Query() limit: number = 10,
        @Query() page: number = 0,
        @Query() priceMin: number = 0,
        @Query() priceMax: number = 2000,
        @Query() stock: boolean = false,
        @Query() category?: ProductCategory
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

        // Fetch products
        const result = await Product.findAll({limit: limit, offset: page * limit, where, include});
        const products: ProductPublicInfo[] = result.map(getProductPublicInfo);
        
        return {
            status: 200,
            data: {
                products: products
            }
        }
    }

    /**
     * Retrieves the publicly available information about a product.
     * 
     * @summary Retrieve a product's detailed information.
     */
    @Get("{productId}")
    @Tags(TAG_PRODUCTS)
    public async getProductById(
        @Path() productId: UUID,
    ) : Promise<GetProductByIdResult> {
        const include: Includeable = {
            required: false,
            association: Product.associations.stock,
            attributes: ["quantity"],
        };

        const result = await Product.sequelize?.transaction(
            {isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ},
            async (t) => {
                const product = await Product.findByPk(productId, {include, transaction: t});
                if (product == null) {
                    return null;
                }
                
                const tags = await product.getCategoryTags(t);
                return {product, tags};
            }
        );
        
        // Product not found
        if (result?.product == null) {
            return Promise.reject(new NotFoundError());
        }

        const product: ProductPublicInfo = getProductPublicInfo(result.product);
        if (result.tags != null) {
            // Let's ignore the "productId"
            const {productId, ...tags} = result.tags.toJSON() as any;
            product.tags = tags;
        }

        return {
            status: 200,
            data: product
        }
    }

    /**
     * 
     * @summary Update a product's details.
     */
    @Patch("{productId}")
    @Tags(TAG_PRODUCTS)
    @Security(SecurityScheme.JWT, [Role.MANAGER])
    public async patchProduct(
        @Path() productId: string,
        @Body() body: UpdateProductParams
    ) : Promise<PatchProductResult> {
        //const product = productsService.updateProduct(productId, body) as any;

        //limit ||= 10; 
        //console.log(limit);
        //await Product.create({"name": "some", description: "some", "category": ProductCategory.TSHIRT, price: 10});
        //await Product.create({"name": "some", description: "some", "category": ProductCategory.TSHIRT, price: 10});

        /*
        const p = await Product.create({"name": "some", description: "some", "category": ProductCategory.TSHIRT, price: 10});
        await p.createTshirt({colour: TshirtColour.BLUE, size: TshirtSize.S, design: "adidas"})
        const p2 = await Product.findAll({include: {
            model: Tshirt,
            where: {
                design: "adidas",
            }
        }});
        */
        //console.log(p?.tshirt);

        return {
            status: 200
        }
    }
}

// ------------------------------ Helper Functions ------------------------------ //

/**
 * Receives a product and transforms it into a product with only public info.
 * 
 * @param product The product to be processed.
 * @returns A product formatted with public info.
 */
function getProductPublicInfo(product: Product): ProductPublicInfo {
    const stock = product.stock;
    const totalStock = stock?.reduce((acc, entry) => acc + entry.quantity, 0);
    const status: ProductStatus = (!product.active || stock?.length == 0) ? 
        ProductStatus.NO_INFO : (totalStock!! == 0) ? 
        ProductStatus.SOLD_OUT : (totalStock!! <= STOCK_THRESHOLD) ? 
        ProductStatus.LAST : ProductStatus.STOCK;
    
    // Make formatted product
    const publicInfo: ProductPublicInfo = {
        productId: product.productId,
        name: product.name,
        description: product.description,
        price: product.price,
        status: status,
        category: product.category,
    }

    return publicInfo;
}

// ------------------------------ Response Objects ------------------------------ //

// TSOA doesn't like "object", so this is a workaround
interface ProductCategoryTags {
    [name: string]: string
}

// TODO images
interface ProductPublicInfo {
    productId: UUID,
    name: string,
    description: string,
    price: number,
    status: ProductStatus,
    //images: string[],
    category: ProductCategory,
    tags?: ProductCategoryTags,
}

interface ProductProtectedInfo extends ProductPublicInfo {
    active: boolean,
    stock: string[],
}

interface GetProductsResult {
    status: 200,
    data: {
        products: ProductPublicInfo[]
    }
}

interface GetProductByIdResult {
    status: 200,
    data?: ProductPublicInfo
}

// TODO
interface PatchProductResult {
    status: 200
}

interface UpdateProductParams {
    name?: string,
    description?: string,
    price?: number,
    active?: boolean
}