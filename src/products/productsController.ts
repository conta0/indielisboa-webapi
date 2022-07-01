import { Body, Controller, Get, Patch, Path, Query, Route, Security, Tags } from "tsoa";
import { Role, SecurityScheme } from "../security/authorization";

const TAG_PRODUCTS = "Products";
class ProductsService {
    findProductById(productId: string) {
        return undefined;
    }

    updateProduct(productId: string, params: UpdateProductParams) {
        return undefined;
    }
}

const productsService = new ProductsService();

@Route("products")
export class ProductsController extends Controller {
    /**
     * If a search criteria is applied, only products with an exact match will be returned.
     * When applicable, if a search parameter has multiple values, returned products will match at least one of those values.
     * 
     * @summary Get a list of products. You may specify a search criteria.
     * 
     * @param limit Limit the number of products returned.
     * @isInt limit Must be an integer >= 1.
     * @minimum limit 1 minimum 1.
     * @example limit 10
     * 
     * @param page Used for pagination. When limit is used,
     * chunks of products will be skipped (e.g. if page=5 and limit=10, the first 50 products will be skipped).
     * @isInt page Must be an integer >= 0.
     * @minimum page 0 minimum 0.
     * @example page 0
     * 
     * @param priceMin Minimum product price (inclusive).
     * @minimum priceMin 0 minimum 0.
     * @example priceMin 0
     * 
     * @param priceMax Maximum product price (inclusive).
     * @maximum priceMax 2000 maximum 2000.
     * @example priceMax 50
     * 
     * @param status Product availability.
     * @example "Available"
     * 
     * @param category Product category.
     * @example "Tshirt"
     */
    @Get()
    @Tags(TAG_PRODUCTS)
    public async getProducts(
        @Query() limit?: number,
        @Query() page?: number,
        @Query() priceMin?: number,
        @Query() priceMax?: number,
        @Query() status?: ProductStatus[],
        @Query() category?: ProductCategory
    ): Promise<GetProductsResult> {
        
        return {
            status: 200,
            data: {
                products: []
            }
        }
    }

    /**
     * 
     * @summary Get detailed information of a product.
     */
    @Get("{productId}")
    @Tags(TAG_PRODUCTS)
    public async getProductById(
        @Path() productId: string,
    ) : Promise<GetProductByIdResult> {
        const product = productsService.findProductById(productId) as any;
        
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
    @Security(SecurityScheme.JWT, [Role.ADMIN])
    public async patchProduct(
        @Path() productId: string,
        @Body() body: UpdateProductParams
    ) : Promise<PatchProductResult> {
        const product = productsService.updateProduct(productId, body) as any;

        return {
            status: 200
        }
    }
}

enum ProductStatus {
    "Available" = "available",
    "Sold Out" = "sold out",
    "Last Units" = "last units",
    "No Info" = "no info"
}

enum ProductCategory {
    "Tshirt" = "tshirt",
    "Book" = "book",
    "Bag" = "bag",
    "Poster" = "poster"
}

// TODO images, tags
interface ProductPublicInfo {
    productId: string,
    name: string,
    description: string,
    price: number,
    active: boolean,
    status: ProductStatus,
    images: string[],
    category: string,
    // tags: undefined,
    stock: string[],
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
    data: ProductPublicInfo
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