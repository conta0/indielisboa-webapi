
import { Body, Controller, Get, Patch, Path, Post, Query, Request, Res, Response, Route, Security, SuccessResponse, Tags, TsoaResponse } from "tsoa";
import { BadRequestErrorResponse, NotFoundErrorResponse } from "../common/interfaces";
import { Username } from "../common/model";
import { AuthRequest, hasRolePrivileges, Role, SecurityScheme } from "../security/authorization";
import { UserService } from "./usersService";

const TAG_USERS = "Users";

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
        const where = (role == undefined) ? {} : {role: role};
        const attributes = ["userId", "username", "role", "createdAt", "updatedAt"];
        const userList: UserFullInfo[] = await UserService.findAll({ where, attributes });

        return {
            status: 200,
            data: {
                users: userList
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
        //const user = await usersService.createUser(body);
        return {
            status: 201,
            data: {
                user: undefined
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

        const attributes = ["userId", "name"];
        const profile: UserProfile | null = await UserService.findByPk(userId, {attributes});

        if (profile == null) {
            return notFoundResponse(404, {status: 404, error: {}});
        }

        return {
            status: 200,
            data: {
                user: profile
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

        //const user = await usersService.updateUserWithId(userId, body);
        //console.log(body);

        return {
            status: 200,
            data: {
                user: undefined
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
        @Path() userId: string,
        @Res() notFoundResponse: TsoaResponse<404, NotFoundErrorResponse>
    ): Promise<GetUserFullInfoResult> {
        const attributes = ["userId", "username", "role", "createdAt", "updatedAt"];
        const user: UserFullInfo | null = await UserService.findByPk(userId, {attributes});

        if (user == null) {
            return notFoundResponse(404, {status: 404, error: {}});
        }

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
        //const user = await usersService.updateUserWithId(userId, body);
        //console.log(body);
        
        return {
            status: 200,
            data: {
                user: undefined
            }
        }
    }


}
/**
 * @example {
        "userId": "d3f73171-304e-48cd-a93f-0602cd2322ed",
        "username": "user000",
        "name": "Alice",
        "role": "admin",
        "createdAt": "2022-08-12T23:55:57.972Z",
        "updatedAt": "2022-08-12T23:55:57.972Z"
    }
 */
interface UserFullInfo {
    userId: string;
    username: Username;
    name: string;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * @example {
      "userId": "09d6e02e-67c0-418f-bd0d-19926f554a71",
      "name": "Alice"
    }
 */
interface UserProfile {
    userId: string;
    name: string;
}

/** JSON response format for the "GET /users" endpoint. */
interface GetUsersResult {
    status: 200,
    data: {
        users: UserFullInfo[]
    }
}

/** JSON response format for the "GET /users/{userId}/fullinfo" endpoint. */
interface GetUserFullInfoResult {
    status: 200,
    data: {
        user: UserFullInfo
    }
}

/** JSON response format for the "GET /users/{userId}" endpoint. */
    interface GetUserProfileResult {
    status: 200,
    data: {
        user: UserProfile
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
        user?: {
            userId: string,
            name: string,
            email: Email,
            role: Role
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
        // Refactor
        user?: {
            userId: string,
            name: string,
            email: Email
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
        // undefined
        user?: {
            userId: string,
            name: string,
            email: Email,
            role: Role
        }
    }
}

/** @format email */
type Email = string;