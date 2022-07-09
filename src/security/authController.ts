import { Body, Controller, Post, Res, Route, SuccessResponse, Tags, TsoaResponse } from "tsoa";
import * as jwt from "jsonwebtoken";
import { JWTFormat } from "./authorization";
import { security as config } from "../config.json";
import { User } from "../users/usersService";
import { Password, Username, UUID } from "../common/model";
import { NotFoundErrorResponse } from "../common/responses";

const secret: string = process.env.SECRET || config.secret;
const cookieName: string = process.env.COOKIE_NAME || config.cookieName;

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
        const user = (await User.findOne({ where:{username: username}}))?.toJSON();

        // Check if user is valid and password matches
        if (user == null || !(await User.validatePassword(user, password))) {
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
        const options: jwt.SignOptions = {
            expiresIn: config.tokenExpiresInSeconds
        }
        
        // jsonwebtoken.sign() only works with a callback
        return new Promise<LoginResult>((resolve, reject) => {
            jwt.sign(payload, secret, options, function(err:any, token: any) {
                if (err) {
                    reject(err);
                } else {
                    controller.setHeader(
                        "Set-Cookie", 
                        `${cookieName}=${token}; Path=/; Max-Age=${config.tokenExpiresInSeconds}; secure; httponly;`
                    );
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
    @SuccessResponse(204, "Logout successfull.")
    public async logout(): Promise<void> {
        this.setHeader("Set-Cookie", `${cookieName}=; Path=/; Max-Age=1;`)
    }
}

interface LoginParams {
    username: Username,
    password: Password,
}

interface LoginResult {
    status: 200,
    data: {
        userId: UUID
    }
}