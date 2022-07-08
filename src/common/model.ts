import { Role } from "../security/authorization";

/** 
 * @pattern ^[A-Za-z][\w]{4,19}$
 * @example "user000"
 */
export type Username = string;

/**
 * @pattern ^[\w]{8,19}$
 * @example "password"
 */
export type Password = string;

/**
 * @format uuid
 */
export type UUID = string

export const USERNAME_PATTERN = /^[A-Za-z][\w]{4,19}$/i
export const PASSWORD_PATTERN = /^[\w]{8,19}$/i

export interface Product {
    productId: string;
    name: string;
    description: string;
    price: number;
}

export interface Location {
    locationId: string,
    address: string
}

export interface UserModel {
    userId: string;
    username: string;
    password: string;
    name: string;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
}