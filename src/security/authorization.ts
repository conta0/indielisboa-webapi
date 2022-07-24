import { Request, response } from "express";
import * as jwt from "jsonwebtoken";
import { AuthenticationError, ErrorCode, ForbiddenError } from "../common/errors";
import { hasRolePrivileges, Role } from "../common/roles";
import { jwt as config } from "../config.json";
import { JwtAccessFormat } from "./authController";

const accessSecret: string = process.env.ACCESS_SECRET || config.accessSecret;
const accessCookie: string = process.env.ACCESS_COOKIE || config.accessCookie;

/**
 * Extends the Express Request object with user information.
 * 
 * @param auth.user User's unique identifier.
 * @param auth.role User's Role in the system.
 * @param auth.location The Location associated to the user.
 */
 export interface AuthRequest extends Request {
    auth: JwtAccessFormat
}

/** User with TSOA'a @Security(name: string, scope?: string[]) */
export enum SecurityScheme {
    JWT = "jwt",
}

const validators = {
    [SecurityScheme.JWT]: jwtValidator
};

/**
 * Adapted from https://tsoa-community.github.io/docs/authentication.html
 * Important: Don't change this function name nor signature. it is registered by tsoa during compille time.
 * 
 * Middleware to check if the requested resource can be accessed.
 * 
 * @param request Express Request object.
 * @param securityName Security scheme to be used.
 * @param scopes List of scopes required to access the resource.
*/
export async function expressAuthentication(request: Request, securityName: string, scopes?: string[]) : Promise<any> {
    const func = validators[securityName as keyof typeof validators];
    if (!func) {
        throw new Error(`Invalid security scheme: ${securityName}`);
    }
    return func(request, scopes);
}

/**
 * Adapted from https://tsoa-community.github.io/docs/authentication.html
 * 
 * Given a JSON Web Token check if it's valid and if the requested resource can be accessed by this token.
 * 
 * @param request Express Request object.
 * @param scopes List of scopes required to access the resource.
*/
async function jwtValidator(request: Request, scopes?: string[]) {
    const token = request.cookies[accessCookie];
    if (token == undefined) {
        response.setHeader("WWW-Authenticate", "Cookie")
        return Promise.reject(new AuthenticationError({message: "Missing authentication token.", code: ErrorCode.TOKEN_MISSING}));
    }
    
    // Verify token.
    jwt.verify(token, accessSecret, function(err: any, decoded: any) {
        if (err) {
            if (err instanceof jwt.TokenExpiredError) {
                throw new AuthenticationError({message: "Expired access token.", code: ErrorCode.TOKEN_EXPIRED});
            }
            throw new ForbiddenError({message: "Invalid access token.", code: ErrorCode.TOKEN_INVALID});
        }

        const { userId, role } = decoded as JwtAccessFormat

        // Adds user info to the request.
        (request as any).auth = {
            userId: userId,
            role: role
        }

        // No scope specified. Nothing to do.
        if (scopes == undefined || scopes == []) return;

        // Check if JWT contains target role.
        if (!hasRolePrivileges(role, scopes[0] as Role)) {
            console.log(`auth error: Got ${role} but expected ${scopes[0]}.`);
            throw new ForbiddenError({message: "Not enough privileges for this action.", code: ErrorCode.PRIVILEGE});
        }
    });
}