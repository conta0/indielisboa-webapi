import { Request } from "express";
import * as jwt from "jsonwebtoken";
import { AuthenticationError, AuthorizationError } from "../common/errors";
import { security as config } from "../config.json";

const secret = process.env.SECRET || config.secret;
const cookieName = process.env.COOKIE_NAME || config.cookieName;

/* 
    A given role is mapped to a binary value.
    Instead of iterating through a collection of scopes, we only need to match bits.
    As a bonus, adding new roles is trivial and we don't need to worry about breaking code.
    However, we have to be careful with the bit mappings.
    Example
        - manager  = 0011
        - seller = 0001
        - basic   = 0000
    If we want to add the "supplier" role that doesn't have the same privileges as "seller":
        - supplier = 0010
        - supplier = 0100
    In the first case "supplier" also has the privileges of "manager".
    In the second case, "supplier" doesn't share privileges with any other role.
*/
export enum Role {
    BASIC = "basic",
    SELLER = "seller",
    MANAGER = "manager",
    ADMIN = "admin",
}

// "Admin" should always be greater than everyone else's
const roleValue = {
    [Role.BASIC]: 0x00,
    [Role.SELLER]: 0x01,
    [Role.MANAGER]: 0x0F,
    [Role.ADMIN]: 0xFF,
};

/**
 * Extends the Express Request object with user information.
 * 
 * @param auth.user User unique identifier.
 * @param auth.role User role in the system.
 */
export interface AuthRequest extends Express.Request {
    auth: {
        userId: string,
        role: Role
    }
}

/**
 * The JSON Web Token format being used.
 * 
 * @param userId User unique identifier
 * @param role User role in the system.
 */
export interface JWTFormat {
    userId: string,
    role: Role,
}

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
        throw new Error("Invalid security name.");
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
    const token = request.cookies[cookieName];
    if (token == undefined) {
        return Promise.reject(new AuthenticationError("Missing an authentication token (jwt)."));
    }
    
    // Verify token.
    jwt.verify(token, secret, function(err: any, decoded: any) {
        if (err) {
            throw new AuthenticationError("Invalid authentication token (jwt)");
        }

        const { userId, role } = decoded as JWTFormat

        // Adds user info to the request.
        (request as any).auth = {
            userId: userId,
            role: role
        }

        console.log("jwt decoded: ", decoded);

        // No scope specified. Nothing to do.
        if (scopes == undefined || scopes == []) return;

        // Check if JWT contains target role.
        if (!hasRolePrivileges(role, scopes[0] as Role)) {
            console.log(`auth error: Got ${role} but expected ${scopes[0]}.`);
            throw new AuthorizationError("Not enough privileges for this action.");
        }
    });
}

/**
 * Check if a given role has the same or more privileges than another.
 * 
 * @param actualRole Given role.
 * @param targetRole Target role.
 * @returns True if given role has same or more privileges.
 */
export function hasRolePrivileges(actualRole: Role, targetRole: Role): boolean {
    const target = roleValue[targetRole as keyof typeof roleValue];
    const actual = roleValue[actualRole as keyof typeof roleValue];
    return ((actual & target) === target);
}