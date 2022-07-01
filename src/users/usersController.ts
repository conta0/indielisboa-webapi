
import { Body, Controller, Get, Patch, Path, Post, Query, Request, Res, Response, Route, Security, SuccessResponse, Tags, TsoaResponse } from "tsoa";
import { BadRequestErrorResponse, NotFoundErrorResponse } from "../common/interfaces";
import { AuthRequest, hasRolePrivileges, Role, SecurityScheme } from "../security/authorization";

/**
 * Information about a user.
 * 
 * @example {
 *  "userId": "user-1",
 *  "email": "alice@mail.com",
 *  "name": "Alice",
 *  "role": "admin"
 * }
 */
export interface User {
    userId: string,
    email: string,
    name: string,
    role: Role
}

const TAG_USERS = "Users";

class UsersService {
    async searchUsers() {
        return [];
    }

    async createUser(params: CreateUserParams) {
        return {
            userId: "user-2",
            name: params.name,
            email: params.email,
            role: Role.BASIC
        };
    }

    async findUserWithId(userId: string) {
        return {
            userId: userId,
            name: "Alice",
            email: "alice@mail.com",
            role: Role.ADMIN
        };
    }

    async updateUserWithId(userId: string, params: UpdateUserProfileParams) {
        return {
            userId: userId,
            name: "Alice",
            email: "alice@mail.com",
            role: Role.ADMIN
        };
    }
}

const usersService = new UsersService();

@Route("users")
export class UsersController extends Controller {
    /**
     * If a search criteria is applied, only users with an **exact** match will be returned.
     * 
     * @summary Retrieve a list of users. You may specify search parameters.
     * 
     * @param role Filter users by role.
     */
    @Get()
    @Tags(TAG_USERS)
    @Security(SecurityScheme.JWT, [Role.ADMIN])
    @SuccessResponse("200", "Successfully returned a list of users.")
    @Response<BadRequestErrorResponse>("400", "Bad Request", {
        status: 400,
        error: {
            fields: {
                role: {
                    message: "should be one of the following; [...]",
                    value: "abc"
                }
            }
        }
    })
    public async getUsers(
        @Query() role?: Role,
    ): Promise<GetUsersResult> {
        const users = await usersService.searchUsers();
        return {
            status: 200,
            data: {
                users: users
            }
        };
        
    }

    /**
     * @summary Create a new user.
     */
    @Post()
    @Tags(TAG_USERS)
    @SuccessResponse("201", "Successfully created a new user.")
    @Response<BadRequestErrorResponse>("400", "Bad Request")
    public async createUser(
        @Body() body: CreateUserParams
    ): Promise<PostUsersResult> {
        const user = await usersService.createUser(body);
        return {
            status: 201,
            data: {
                user: user
            }
        }
    }

    /**
     * Only the own user, or an account with sufficient privileges, may view this profile.
     * 
     * @summary Retrieve the user profile.
     * @param userId User's unique identifier.
     */
    @Get("{userId}")
    @Tags(TAG_USERS)
    @Security(SecurityScheme.JWT, [Role.BASIC])
    @SuccessResponse(200, "Successfully returned the user's profile.")
    public async getUserProfile(
        @Request() request: AuthRequest,
        @Path() userId: string,
        @Res() notFoundResponse: TsoaResponse<404, NotFoundErrorResponse>
    ): Promise<GetUserProfileResult> {
        // Check if the request has sufficient privileges to view this user profile.
        const auth = request.auth; 
        if (auth.userId !== userId && !hasRolePrivileges(auth.role, Role.ADMIN)) {
            return notFoundResponse(404, {status: 404, error: {}});
        }

        const user: any = await usersService.findUserWithId(userId);

        return {
            status: 200,
            data: {
                user: user
            }
        }
    }

    /**
     * Only the own user, or an account with sufficient privileges, may edit this profile.
     * 
     * @summary Update user profile.
     * 
     * @param userId User's unique identifier.
     */
    @Patch("{userId}")
    @Tags(TAG_USERS)
    @Security(SecurityScheme.JWT, [Role.BASIC])
    @SuccessResponse("200", "Successfully updated the user's profile.")
    @Response<BadRequestErrorResponse>("400", "Bad Request", {
        status: 400,
        error: {
            fields: {
                "body.name": {
                    message: "invalid string value",
                    value: 0
                }
            }
        }
    })
    public async patchUserProfile(
        @Request() request: AuthRequest,
        @Path() userId: string,
        @Body() body: UpdateUserProfileParams,
        @Res() notFoundResponse: TsoaResponse<404, NotFoundErrorResponse>
    ): Promise<PatchUserProfileResult> {
        // Check if the request has sufficient privileges to view this user profile.
        const auth = request.auth; 
        if (auth.userId !== userId && !hasRolePrivileges(auth.role, Role.ADMIN)) {
            return notFoundResponse(404, {status: 404, error: {}});
        }

        const user = await usersService.updateUserWithId(userId, body);
        console.log(body);

        return {
            status: 200,
            data: {
                user: user
            }
        }
    }

    /**
     * @summary Retrieve the user's complete information.
     * @param userId User's unique identifier.
     */
    @Get("{userId}/fullinfo")
    @Tags(TAG_USERS)
    @Security(SecurityScheme.JWT, [Role.ADMIN])
    @SuccessResponse(200, "Successfully returned the user's information.")
    public async getUserFullInfo(
        @Path() userId: string
    ): Promise<GetUserFullInfoResult> {
        const user: any = await usersService.findUserWithId(userId);
        return {
            status: 200,
            data: {
                user: user
            }
        }
    }

    /**
     * 
     * @summary Update user's role.
     * 
     * @param userId User's unique identifier.
     */
    @Patch("{userId}/fullinfo")
    @Tags(TAG_USERS)
    @Security(SecurityScheme.JWT, [Role.ADMIN])
    @SuccessResponse("200", "Successfully updated the user details.")
    @Response<BadRequestErrorResponse>("400", "Bad Request", {
        status: 400,
        error: {
            fields: {
                "body.name": {
                    message: "invalid string value",
                    value: 0
                }
            }
        }
    })
    public async patchUserFullInfo(
        @Path() userId: string,
        @Body() body: UpdateUserFullInfoParams
    ): Promise<PatchUserFullInfoResult> {
        const user = await usersService.updateUserWithId(userId, body);
        console.log(body);

        return {
            status: 200,
            data: {
                user: user
            }
        }
    }


}

interface GetUsersResult {
    status: 200,
    data: {
        users: User[]
    }
}

/**
 * JSON request format to create a new user.
 * 
 * @example {
 *  "name": "Alice",
 *  "email": "alice@mail.com"
 * }
 */
interface CreateUserParams {
    name: string,
    email: Email,
}

/**
 * JSON request format to update an existing user's profile.
 * 
 * @example {
 *  "name": "Alice"
 * }
 */
 interface UpdateUserProfileParams {
    name: string,
}

/**
 * JSON request format to update an existing user's details.
 * 
 * @example {
 *  "name": "Alice"
 *  "role": "seller"
 * }
 */
interface UpdateUserFullInfoParams {
    name: string,
    role: Role
}

/**
 * JSON response format for the "POST /users" endpoint.
 * 
 * @example {
 *  "status": 201,
 *  "data": {
 *      "created": {
 *         "userId": "user-1",
 *          "name": "Alice",
 *          "email": "alice@mail.com",
 *          "role": "none"
 *      }
 *  }
 * }
 */
interface PostUsersResult {
    status: 201,
    data: {
        user: {
            userId: string,
            name: string,
            email: Email,
            role: Role
        }
    }
}

/**
 * JSON response format for the "GET /users/{userId}" endpoint.
 * 
 * @example {
 *  "status": 200,
 *  "data": {
 *      "user": {
 *          "userId": "user-1",
 *          "name": "Alice",
 *          "email": "alice@mail.com"
 *      }
 *  }
 * }
 */
 interface GetUserProfileResult {
    status: 200,
    data: {
        user: {
            userId: string,
            name: string,
            email: Email
        }
    }
}

/**
 * JSON response format for the "PATCH /users/{userId}" endpoint.
 * 
 * @example {
 *  "status": 200,
 *  "data": {
 *      "user": {
 *          "userId": "user-1",
 *          "name": "Alice",
 *          "email": "alice@mail.com"
 *      }
 *  }
 * }
 */
 interface PatchUserProfileResult {
    status: 200,
    data: {
        user: {
            userId: string,
            name: string,
            email: Email
        }
    }
}

/**
 * JSON response format for the "GET /users/{userId}/fullinfo" endpoint.
 * 
 * @example {
 *  "status": 200,
 *  "data": {
 *      "user": {
 *          "userId": "user-1",
 *          "name": "Alice",
 *          "email": "alice@mail.com",
 *          "role": "admin"
 *      }
 *  }
 * }
 */
interface GetUserFullInfoResult {
    status: 200,
    data: {
        user: {
            userId: string,
            name: string,
            email: Email,
            role: Role
        }
    }
}

/**
 * JSON response format for the "PATCH /users/{userId}/fullinfo" endpoint.
 * 
 * @example {
 *  "status": 200,
 *  "data": {
 *      "user": {
 *          "userId": "user-1",
 *          "name": "Alice",
 *          "email": "alice@mail.com",
 *          "role": "admin"
 *      }
 *  }
 * }
 */
 interface PatchUserFullInfoResult {
    status: 200,
    data: {
        user: {
            userId: string,
            name: string,
            email: Email,
            role: Role
        }
    }
}

/** @format email */
type Email = string;