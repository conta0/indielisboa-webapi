import { Transaction, UniqueConstraintError } from "sequelize";
import { Body, Controller, Get, Path, Post, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import { ConflitError, ErrorCode, NotFoundError } from "../common/errors";
import { UUID } from "../common/model";
import { AuthenticationErrorResponse, ForbiddenErrorResponse, BadRequestErrorResponse, ServerErrorResponse, ConflitErrorResponse } from "../common/responses";
import { Role } from "../common/roles";
import { Product } from "../products/productModel";
import { Stock } from "../products/stockModel";
import { Price, ProductCategory } from "../products/types";
import { SecurityScheme } from "../security/authorization";
import { Location } from "./locationModel";

const TAG_LOCATIONS = "Locations";

@Route("locations")
export class LocationsController extends Controller {
    /**
     * @summary Retrieve a list of locations.
     */
    @Get()
    @Tags(TAG_LOCATIONS)
    @Security(SecurityScheme.JWT, [Role.SELLER])
    @SuccessResponse(200, "Successfully returned a list of locations.")
    @Response<AuthenticationErrorResponse>(401, "Not Authenticated.")
    @Response<ForbiddenErrorResponse>(403, "Not Authorized.")
    @Response<ServerErrorResponse>(500, "Internal Server Error.")
    public async getLocations(
    ): Promise<SearchLocationsResult> {
        const result: Location[] = await Location.findAll();
        const locations: LocationInfo[] = result.map(toLocationInfo);

        return {
            status: 200,
            data: locations
        };
    }

    /** 
     * Creates a Location and returns its unique identifier.
     * The location's address must be unique.
     * 
     * @summary Create a new location.
     */
    @Post()
    @Tags(TAG_LOCATIONS)
    @Security(SecurityScheme.JWT, [Role.MANAGER])
    @SuccessResponse(201, "Successfully created a location.")
    @Response<BadRequestErrorResponse>(400, "Bad Request", {
        status: 400,
        error: {
            fields: {
                "body.address": {
                    message: "invalid string value",
                    value: 1
                }
            }
        }
    })
    @Response<AuthenticationErrorResponse>(401, "Not Authenticated.")
    @Response<ForbiddenErrorResponse>(403, "Not Authorized.")
    @Response<ConflitErrorResponse>(409, "Can't create location.")
    @Response<ServerErrorResponse>(500, "Internal Server Error.")
    public async createLocation(
        @Body() body: CreateLocationParams,
    ): Promise<CreateLocationResult> {
        const { address } = body;
        
        try {
            const location = await Location.create({address});
            return {
                status: 201,
                data: location.locationId
            }

        } catch (err) {
            // Duplicate location
            if (err instanceof UniqueConstraintError) {
                return Promise.reject(new ConflitError({
                    message: "Can't create location.",
                    code: ErrorCode.DUPLICATED,
                    fields: {
                        "body.address": {
                            message: "Address not unique.",
                            value: address,
                        }
                    }
                }))
            }
            throw err;
        }
    }

    /**
     * Returns the location information and its list of products (stock).
     * Each product of this list has its unique identifier, name, price, category and quantity at the location.
     * 
     * @summary Retrieve the location info and its list of products.
     */
    @Get("{locationId}")
    @Tags(TAG_LOCATIONS)
    @Security(SecurityScheme.JWT, [Role.SELLER])
    @SuccessResponse(200, "Successfully the location info.")
    @Response<AuthenticationErrorResponse>(401, "Not Authenticated.")
    @Response<ForbiddenErrorResponse>(403, "Not Authorized.")
    @Response<ForbiddenErrorResponse>(404, "Location not found.")
    @Response<ServerErrorResponse>(500, "Internal Server Error.")
    public async getLocationById(
        @Path() locationId: UUID
    ): Promise<GetLocationByIdResult> {
        
        const result = await Location.findByPk(locationId, {
            include: {
                association: Location.associations.stock,
                attributes: ["productId", "quantity"],
                include: [
                    {
                        required: true,
                        association: Stock.associations.product,
                        attributes: ["productId", "name", "price", "category"],
                    }
                ]
            },
        });
        
        // Location not found
        if (result == null) {
            return Promise.reject(new NotFoundError());
        }

        const locationInfo: LocationWithStock = toLocationWithStock(result);

        return {
            status: 200,
            data: locationInfo
        };
    }
}

// ------------------------------ Helper Functions ------------------------------ //

/**
 * Takes a Location and formats it into a LocationInfo. 
 * 
 * @param location The Location to be formatted.
 * @returns The formatted Location.
 */
function toLocationInfo(location: Location): LocationInfo {
    return {
        locationId: location.locationId,
        address: location.address
    }
}

/**
 * Takes a Location and formats it into a LocationInfo. 
 * 
 * @param location The Location to be formatted.
 * @returns The formatted Location.
 */
 function toLocationWithStock(location: Location): LocationWithStock {
    const stock: ProductInfo[] = location.stock?.map(stock => {
        const product = stock.product!!;

        return {
            productId: product.productId,
            name: product.name,
            price: product.price,
            category: product.category,
            quantity: stock.quantity,
        }
    }) || [];

    return {
        locationId: location.locationId,
        address: location.address,
        stock: stock 
    }
}

// ------------------------------ Request Formats ------------------------------ //

/** JSON request format for the "POST /locations" endpoint. */
 interface CreateLocationParams {
    /** @example "Some address" */
    address: string
}

// ------------------------------ Response Formats ------------------------------ //

interface ProductInfo {
    productId: UUID,
    name: string,
    price: number,
    category: ProductCategory,
    quantity: number
}

interface LocationInfo {
    locationId: UUID,
    address: string,
}

interface LocationWithStock extends LocationInfo {
    stock: ProductInfo[]
}

/** JSON response format for the "GET /locations" endpoint. */
interface SearchLocationsResult {
    status: 200,
    data: LocationInfo[]
}

/** JSON response format for the "POST /locations" endpoint. */
interface CreateLocationResult {
    status: 201,
    data: UUID
}

/** JSON response format for the "GET /locations/{locationId}" endpoint. */
interface GetLocationByIdResult {
    status: 200,
    data: LocationWithStock
}