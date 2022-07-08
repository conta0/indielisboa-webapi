import { Body, Controller, Get, Patch, Path, Post, Query, Request, Res, Response, Route, Security, SuccessResponse, Tags, TsoaResponse } from "tsoa";
import { BadRequestErrorResponse, NotFoundErrorResponse } from "../common/responses";
import { Password, UserModel, Username, UUID } from "../common/model";
import { AuthRequest, hasRolePrivileges, Role, SecurityScheme } from "../security/authorization";
import { User } from "./usersService";
import { UniqueConstraintError } from "sequelize";
import { processSequelizeError, SequelizeConstraintMapper } from "../common/errors";

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
        const attributes = ["userId", "name", "role", "createdAt", "updatedAt"];
        const userList: UserFullInfo[] = await User.findAll({ where, attributes });

        return {
            status: 200,
            data: {
                list: userList
            }
        };
    }

    /**
     * Only retrieves users with the role 'seller'.
     * 
     * @summary Retrieve a list of users with the 'seller' role. You may specify search parameters.
     */
    @Get("sellers")
    @Tags(TAG_USERS)
    @Security(SecurityScheme.JWT, [Role.MANAGER])
    @SuccessResponse("200", "Successfully returned a list of users with the 'seller' role.")
    public async getSellers(
    ): Promise<GetSellersResult> {
        const where = {role: Role.SELLER};
        const attributes = ["userId", "name"];
        const sellerList: UserProfile[] = await User.findAll({ where, attributes });

        return {
            status: 200,
            data: {
                list: sellerList
            }
        };
    }

    /**
     * @summary Create a new user.
     */
    @Post()
    @Tags(TAG_USERS)
    @SuccessResponse("201", "Successfully created a new user.")
    public async createUser(
        @Body() body: CreateUserParams,
        @Res() badRequestError: TsoaResponse<400, BadRequestErrorResponse>
    ): Promise<PostUsersResult> {
        const { username, password, name } = body;

        try {
            const result = await User.create({username, password, name, role: Role.BASIC})
            const user: UserModel = result.toJSON();
            return {
                status: 201, 
                data: {
                    userId: user.userId,
                    name: user.name
                }
            }
        } catch(error: any) {
            if (error instanceof UniqueConstraintError) {
                const mapper: SequelizeConstraintMapper = {
                    "username": {name: "body.username", message: "Username already exists."}
                }
                const fields = processSequelizeError(error, mapper);
                return badRequestError(400, {
                    status: 400, 
                    error: {
                        fields: fields
                    }
                });
            }

            return Promise.reject(error);
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
    @SuccessResponse("200", "Successfully returned the user's profile.")
    public async getUserProfile(
        @Request() request: AuthRequest,
        @Path() userId: UUID,
        @Res() notFoundResponse: TsoaResponse<404, NotFoundErrorResponse>
    ): Promise<GetUserProfileResult> {
        // Check if the request has sufficient privileges to view this user profile.
        if (request.auth.userId !== userId && !hasRolePrivileges(request.auth.role, Role.MANAGER)) {
            return notFoundResponse(404, {status: 404, error: {}});
        }

        const attributes = ["userId", "name"];
        const profile: UserProfile | null = await User.findByPk(userId, {attributes});

        if (profile == null) {
            return notFoundResponse(404, {status: 404, error: {}});
        }

        return {
            status: 200,
            data: profile
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
        @Path() userId: UUID,
        @Body() body: UpdateUserProfileParams,
        @Res() notFoundResponse: TsoaResponse<404, NotFoundErrorResponse>
    ): Promise<PatchUserProfileResult> {
        // Check if the request has sufficient privileges to edit this user profile.
        if (request.auth.userId !== userId && !hasRolePrivileges(request.auth.role, Role.ADMIN)) {
            return notFoundResponse(404, {status: 404, error: {}});
        }

        const { name } = body;
        const attributes = ["userId", "name"];

        try {
            const result: UserModel = await User.sequelize?.transaction(async (transaction) => {
                const user = await User.findByPk(userId, {attributes, transaction});
                if (user == null) {
                    return notFoundResponse(404, {status: 404, error: {}});
                }
                user.name = name;
                await user.save({transaction});

                return user.toJSON();
            });
            
            const profile: UserProfile = {
                userId: result.userId,
                name: result.name
            }

            return {
                status: 200,
                data: profile
            }

        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * @summary Retrieve the user's information.
     * @param userId User's unique identifier.
     */
    @Get("{userId}/fullinfo")
    @Tags(TAG_USERS)
    @Security(SecurityScheme.JWT, [Role.ADMIN])
    @SuccessResponse("200", "Successfully returned the user's information.")
    public async getUserFullInfo(
        @Path() userId: UUID,
        @Res() notFoundResponse: TsoaResponse<404, NotFoundErrorResponse>
    ): Promise<GetUserFullInfoResult> {
        const attributes = ["userId", "name", "role", "createdAt", "updatedAt"];
        const user: UserFullInfo | null = await User.findByPk(userId, {attributes});

        if (user == null) {
            return notFoundResponse(404, {status: 404, error: {}});
        }

        return {
            status: 200,
            data: user
        }
    }

    /**
     * @summary Update user's information.
     * 
     * @param userId User's unique identifier.
     */
    @Patch("{userId}/fullinfo")
    @Tags(TAG_USERS)
    @Security(SecurityScheme.JWT, [Role.ADMIN])
    @SuccessResponse("200", "Successfully updated the user's information.")
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
    @Response<NotFoundErrorResponse>("404", "User Not Found")
    public async patchUserFullInfo(
        @Request() request: AuthRequest,
        @Path() userId: UUID,
        @Body() body: UpdateUserFullInfoParams,
        @Res() notFoundErrorResponse: TsoaResponse<404, NotFoundErrorResponse>
    ): Promise<PatchUserFullInfoResult> {
        const { name, role } = body;
        const attributes = ["userId", "name", "role", "createdAt", "updatedAt"];
   
        try {    
            const fullinfo = await User.sequelize?.transaction(async (transaction) => {
                const user = await User.findByPk(userId, {attributes, transaction});
                if (user == null) {
                    return notFoundErrorResponse(404, {status: 404, error: {}});
                }
                
                // Only changes roles for other users.
                if (request.auth.userId !== userId) {
                    user.role = role;
                }
                user.name = name;

                await user.save({transaction});
                
                const fullinfo: UserFullInfo = {
                    userId: user.userId,
                    name: user.name,
                    role: user.role,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                }

                return fullinfo;
            });
            
            return {
                status: 200,
                data: fullinfo
            }

        } catch (error) {
            return Promise.reject(error);
        }
    }
}

// ------------------------------ User Specific Types ------------------------------ //

/** @example "Alice" */
type USERS_NAME = string;

// ------------------------------ Request Formats ------------------------------ //

/** JSON request format to create a new user. */
interface CreateUserParams {
    username: Username,
    password: Password,
    name: USERS_NAME,
}

/** JSON request format to update an existing user. */
interface UpdateUserProfileParams {
    name: USERS_NAME,
}

/** JSON request format to update an existing user's details. */
interface UpdateUserFullInfoParams {
    name: USERS_NAME,
    role: Role
}

// ------------------------------ Response Formats ------------------------------ //

interface UserProfile {
    userId: UUID;
    name: USERS_NAME;
}

interface UserFullInfo {
    userId: UUID;
    name: USERS_NAME;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
}

/** JSON response format for the "GET /users" endpoint. */
interface GetUsersResult {
    status: 200,
    data: {
        list: UserFullInfo[]
    }
}

/** JSON response format for the "GET /users" endpoint. */
interface GetSellersResult {
    status: 200,
    data: {
        list: UserProfile[]
    }
}

/** JSON response format for the "GET /users/{userId}/fullinfo" endpoint. */
interface GetUserFullInfoResult {
    status: 200,
    data: UserFullInfo
}

/** JSON response format for the "GET /users/{userId}" endpoint. */
    interface GetUserProfileResult {
    status: 200,
    data: UserProfile
}

/** JSON response format for the "POST /users" endpoint. */
interface PostUsersResult {
    status: 201,
    data: UserProfile
}

/** JSON response format for the "PATCH /users/{userId}" endpoint. */
 interface PatchUserProfileResult {
    status: 200,
    data?: UserProfile
}

/** JSON response format for the "PATCH /users/{userId}/fullinfo" endpoint. */
 interface PatchUserFullInfoResult {
    status: 200,
    data?: UserFullInfo
}