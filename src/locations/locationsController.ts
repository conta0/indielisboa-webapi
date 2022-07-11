import { Body, Controller, Get, Post, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import { AuthenticationErrorResponse, ForbiddenErrorResponse, BadRequestErrorResponse, ServerErrorResponse } from "../common/responses";
import { Role } from "../common/roles";
import { SecurityScheme } from "../security/authorization";
import { Location } from "./locationsService";

const TAG_LOCATIONS = "Locations";

@Route("locations")
export class LocationsController extends Controller {
    /**
     * @summary Get a list of locations.
     */
    @Get()
    @Tags(TAG_LOCATIONS)
    @Security(SecurityScheme.JWT, [Role.MANAGER])
    @SuccessResponse("200", "Successfully returned a list of locations.")
    @Response<ServerErrorResponse>("500", "Internal Server Error")
    public async getLocations(
    ): Promise<SearchLocationsResult> {
        Location.findAll();
        return {
            status: 200,
            data: {
                locations: undefined
            }
        };
    }

    /** 
     * @summary Create a new location.
     */
    @Post()
    @Tags(TAG_LOCATIONS)
    @Security(SecurityScheme.JWT, [Role.MANAGER])
    @SuccessResponse("201", "Successfully created a new location.")
    @Response<BadRequestErrorResponse>("400", "Bad Request", {
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
    @Response<AuthenticationErrorResponse>("401", "Unauthorized")
    @Response<ForbiddenErrorResponse>("403", "Forbidden")
    @Response<ServerErrorResponse>("500", "Internal Server Error")
    public async postSale(
        @Body() body: CreateLocationParams,
    ): Promise<CreateLocationResult> {
        //const result: any = locationsService.createLocation(body);
        return {
            status: 201,
            data: {
                location: undefined
            }
        };
    }
}

/**
 * JSON response format for a search locations operation.
 * 
 * @example {
 *  "status": 200,
 *  "data": {
 *      "locations": [
 *          {
 *              "locationId": "location-1",
 *              "address": "Location 1"
 *          },
 *          {
 *              "locationId": "location-2",
 *              "address": "Location 2"
 *          }
 *      ]
 *  }
 * }
 */
interface SearchLocationsResult {
    status: 200,
    data: {
        locations: undefined
    }
}

/**
 * JSON response format for a create location operation.
 * 
 * @example {
 *  "status": 201,
 *  "data": {
 *      "created": {
 *          "locationId": "location-1",
 *          "address": "Location 1"
 *      }
 *  }
 * }
 */
interface CreateLocationResult {
    status: 201,
    data: {
        location: undefined
    }
}

/**
 * JSON request format to create a new location.
 *  
 * @example {
 *   "address": "Location 1"
 * }
 */
interface CreateLocationParams {
    address: string
}