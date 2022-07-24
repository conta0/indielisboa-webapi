import { Body, Controller, Post, Request, Response, Route, SuccessResponse, Tags } from "tsoa";
import * as jwt from "jsonwebtoken";
import { jwt as config } from "../config.json";
import { User } from "../users/usersService";
import { Password, Username, UUID } from "../common/model";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { Role } from "../common/roles";
import { Transaction } from "sequelize";
import { getNowAfterSeconds, hasDateExpired, randomToken, validateData } from "../utils/crypto";
import { AuthenticationError, ErrorCode, ForbiddenError, NotFoundError } from "../common/errors";
import { AuthenticationErrorResponse, ForbiddenErrorResponse, NotFoundErrorResponse } from "../common/responses";

// Access token info. As the name implies, this token grants access to the application resources.
const accessSecret: string = process.env.ACCESS_SECRET || config.accessSecret;
const accessCookie: string = process.env.ACCESS_COOKIE || config.accessCookie;
const accessExpires: number = config.accessExpiresInSeconds;

// Refresh token info. This token is used to refresh the access token.
const refreshCookie: string = process.env.REFRESH_COOKIE || config.refreshCookie;
const refreshExpires: number = config.refreshExpiresInSeconds;

/**
 * The JSON Web Token format for the application access token.
 * 
 * @param userId User's unique identifier.
 * @param role User's role in the system.
 * @param locationId The Location associated to the user.  
 */
 export interface JwtAccessFormat {
    userId: UUID,
    role: Role,
    locationId?: UUID,
}

const TAG_AUTH = "Auth";
@Route("auth")
export class AuthController extends Controller {
    /**
     * Login with an user account to access protected resources.
     * A pari of JSON Web Tokens will be set as cookies for application access and authentication.
     * 
     * @summary Login an user account.
     */
    @Post("login")
    @Tags(TAG_AUTH)
    @SuccessResponse(200, "Login successfull.")
    @Response<NotFoundErrorResponse>(404, "User Not Found.")
    public async login(
        @Request() request: ExpressRequest,
        @Body() body: LoginParams,
    ): Promise<LoginResult> {
        const { username, password } = body;
        
        // Using a Repeateable Read transaction because we want to ensure the user info doesn't change.
        const result = await User.sequelize?.transaction(
            {isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ},
            async (t) => {
                const user = await User.findOne({where: {username: username}, transaction: t});
                
                // Check if user exists and password matches
                if (user == null || !(await validateData(password, user.password))) {
                    return null;
                }

                // Create refresh token and expiration Date and save it
                const refreshToken = await randomToken();
                const expiresDate: Date = getNowAfterSeconds(refreshExpires);
                user.token = refreshToken;
                user.tokenExpiresDate = expiresDate;
                await user.save({transaction: t});

                return user;
            }
        );
        
        // User not found or password mismatch. However, we don't want to inform which (extra security).
        if (result == null) {
            return Promise.reject(new NotFoundError());
        }
        
        // TSOA doesn't have an injectable Response object.
        // We can circumvent this by using Express.Request to access the associated Response object.
        const response = request.res as ExpressResponse;
        
        // Generate new access token and set cookies
        const user = result.toJSON();
        const accessPayload: JwtAccessFormat = {
            userId: user.userId,
            role: user.role
        };

        await setAccessCookie(response, accessPayload);
        await setRefreshCookie(response, user.token!!);

        return {
            status: 200,
            data: user.userId
        }
    }

    /**
     * The server will clear the authentication tokens.
     * 
     * @summary Logout the current user account.
     */
    @Post("logout")
    @Tags(TAG_AUTH)
    @SuccessResponse(204, "Logout successfull.")
    public async logout(
        @Request() request: ExpressRequest
    ): Promise<void> {
        const accessToken: string = request.cookies[accessCookie];

        try {
            const payload: any = await verifyToken(accessToken, accessSecret, {ignoreExpiration: true});
            const { userId } = payload; 
            await User.sequelize?.transaction(
                {isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ},
                async (t) => {
                    const user = await User.findOne({where: {userId: userId}, transaction: t});
    
                    // This token is invalid, so nothing to do. 
                    if (user == null) {
                        return;
                    }
    
                    // Remove token information
                    user.token = null;
                    user.tokenExpiresDate = null;
                    await user.save({transaction: t});
                }
            )
        } catch(err) {
            // We really don't care about errors here, since we're trying to logout the user.
            // Even if there was a DB error, it doesn't matter to the user.
            ;
        }
        
        // Clear cookies.
        const response = request.res;
        response?.clearCookie(accessCookie);
        response?.clearCookie(refreshCookie);
    }

    /**
     * When receiving a valid refresh token, generates a new access token and extends the duration
     * of the refresh token.
     * If either token is invalid, or if the refresh token has expired, the server won't refresh the tokens.
     * 
     * @summary Refresh authentication tokens.
     */
    @Post("refresh")
    @Tags(TAG_AUTH)
    @SuccessResponse(204, "Refresh successfull.")
    @Response<AuthenticationErrorResponse>(401, "Missing Authentication tokens.")
    @Response<ForbiddenErrorResponse>(403, "Request refused. Invalid tokens.")
    public async refresh(
        @Request() request: ExpressRequest,
    ): Promise<void> {
        const accessToken: string = request.cookies[accessCookie];
        const refreshToken: string = request.cookies[refreshCookie];
        
        // Both tokens must exist
        if (accessToken == null || refreshToken == null) {
            return Promise.reject(new AuthenticationError());
        }

        // Verify if access token is valid
        let payload: any;
        try {
            payload = await verifyToken(accessToken, accessSecret, {ignoreExpiration: true});
        } catch (error) {
            return Promise.reject(new ForbiddenError({message: "Invalid access token.", code: ErrorCode.TOKEN_INVALID}));
        }

        const result = await User.sequelize?.transaction(
            {isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ},
            async (t) => {
                const userId = (payload as JwtAccessFormat).userId;
                const user = await User.findOne({where: {userId: userId, token: refreshToken}, transaction: t});

                // Check if user exists with that token and if the token is still valid
                if (user == null || hasDateExpired(user.tokenExpiresDate)) {
                    return null;
                }

                // Create new refresh token (token rotation)
                const newRefreshToken = await randomToken();
                const expiresDate: Date = getNowAfterSeconds(refreshExpires);
                user.token = newRefreshToken;
                user.tokenExpiresDate = expiresDate;
                await user.save({transaction: t});

                return user;
            }
        );

        // Refresh tokens has expired or is invalid
        if (result == null) {
            return Promise.reject(new ForbiddenError());
        }

        // TSOA doesn't have an injectable Response object.
        // We can circumvent this by using Express.Request to access the associated Response object.
        const response = request.res as ExpressResponse;
        
        // Generate new tokens and set cookies
        const user = result.toJSON();
        const accessPayload: JwtAccessFormat = {
            userId: user.userId,
            role: user.role
        };
        
        await setAccessCookie(response, accessPayload);
        await setRefreshCookie(response, user.token!!);
    }
}

interface LoginParams {
    username: Username,
    password: Password,
}

interface LoginResult {
    status: 200,
    data: UUID
}

async function setAccessCookie(response: ExpressResponse, payload: JwtAccessFormat): Promise<void> {
    // This isn't a typo. We allow the access token to exist for as long as the refresh token does.
    const maxAge = refreshExpires * 1000;
    const accessToken = await signPayload(payload, accessSecret, {expiresIn: accessExpires});
    response.cookie(accessCookie, accessToken, {path: "/", secure: true, httpOnly: true, maxAge});
}

async function setRefreshCookie(response: ExpressResponse, token: string): Promise<void> {
    const maxAge = refreshExpires * 1000;
    response.cookie(refreshCookie, token, {path: "/", secure: true, httpOnly: true, maxAge});
}

/**
 * jsonwebtoken.sign() only works with a callback.
 * This function acts as an adapter.
 * 
 * @param payload The data to be encoded.
 * @param secret The secret key.
 * @param options JWT Encoding options.
 */
async function signPayload(
    payload: string | Object | Buffer,
    secret: jwt.Secret,
    options: jwt.SignOptions
): Promise<string> {
    return new Promise((resolve, reject) => {
        jwt.sign(payload, secret, options, function(err: any, encoded: any) {
            if (err) {
                reject(err);
            } else {
                resolve(encoded);
            }
        })
    })
}

/**
 * jsonwebtoken.verify() only works with a callback.
 * This function acts as an adapter.
 * 
 * @param token The encoded data.
 * @param secret The secret key.
 * @param options JWT Verify options.
 */
async function verifyToken(
    token: string,
    secret: jwt.Secret | jwt.GetPublicKeyOrSecret,
    options?: jwt.VerifyOptions
): Promise<jwt.Jwt | jwt.JwtPayload | string> {
    return new Promise((resolve, reject) => {
        jwt.verify(token, secret, options, function(err: any, decoded: any) {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        })
    })
}