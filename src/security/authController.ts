import { Body, Controller, Post, Produces, Res, Response, Route, Security, SuccessResponse, Tags, TsoaResponse } from "tsoa";
import * as jwt from "jsonwebtoken";
import { JWTFormat } from "./authorization";
import { security as config } from "../config.json";
import { UserService } from "../users/usersService";
import { Password, Username } from "../common/model";
import { NotFoundErrorResponse } from "../common/interfaces";

const secret = process.env.SECRET || config.secret;
const cookieName = process.env.COOKIE_NAME || config.cookieName;

const TAG_AUTH = "Auth";
@Route("auth")
export class AuthController extends Controller {
    /**
     * Login with an user account to access protected resources.
     * A JSON Web Token will be set as a cookie for further authentication purposes.
     * 
     * @summary Login an user account.
     */
    @Post("login")
    @Tags(TAG_AUTH)
    @SuccessResponse(200, "Login successfull.")
    public async login(
        @Body() body: LoginParams,
        @Res() notFoundResponse: TsoaResponse<404, NotFoundErrorResponse>
    ): Promise<LoginResult> {
        const { username, password } = body;

        // Fetch user
        const user = (await UserService.findOne({ where:{ username: username}}))?.toJSON();

        // Check if user is valid and password matches
        if (user == null || !(await UserService.validatePassword(user, password))) {
            return notFoundResponse(404, {
                status: 404,
                error: {}
            });
        }

        // Create JWT with the payload and set cookie
        const controller = this;
        const payload: JWTFormat = {
            userId: user.userId,
            role: user.role
        };

        // jsonwebtoken.sign() only works with callback
        return new Promise<LoginResult>((resolve, reject) => {
            jwt.sign(payload, secret, function(err:any, token: any) {
                if (err) {
                    reject(err);
                } else {
                    controller.setHeader("Set-Cookie", `${cookieName}=${token}; Path=/;`);
                    resolve({
                        status: 200,
                        data: {
                            userId: user.userId
                        }
                    });
                }
            });
        });
    }

    /**
     * @summary Logout the current user account.
     */
    @Post("logout")
    @Tags(TAG_AUTH)
    @SuccessResponse(200, "Logout successfull.")
    public async logout(): Promise<void> {
        this.setHeader("Set-Cookie", `${cookieName}=; Path=/; Max-Age=1;`)
    }
}

interface LoginParams {
    username: Username,
    password: Password,
}

/**
 * @example {
        "status": 200,
        "data": {
            "userId": "424c9011-81e1-4ad7-818f-802f9a9bc9ce"
        }
    }
 */
interface LoginResult {
    status: 200,
    data: {
        userId: string
    }
}