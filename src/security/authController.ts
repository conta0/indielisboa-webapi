import { Body, Controller, Post, Route, Tags } from "tsoa";
import * as jwt from "jsonwebtoken";
import { JWTFormat, Role } from "./authorization";

const {secret, cookieName} = require("../config.json").security;

const TAG_AUTH = "Auth";
@Route("auth")
export class AuthController extends Controller {

    @Post("login")
    @Tags(TAG_AUTH)
    public async login(
        @Body() body: LoginParams
    ) {
        console.log("login");
        console.log(body);

        // TODO
        const payload: JWTFormat = {
            userId: "user-1",
            role: Role.SELLER
        };

        // Create JWT and set cookie
        const controller = this;
        jwt.sign(payload, secret, function(err:any, token: any) {
            controller.setHeader("Set-Cookie", `${cookieName}=${token}; Path=/;`);
        });
    }

    @Post("logout")
    @Tags(TAG_AUTH)
    public async logout() {
        console.log("logout");
        this.setHeader("Set-Cookie", `${cookieName}=; Path=/; Max-Age=1;`)
        return {};
    }
}

interface LoginParams {
    email: string
}