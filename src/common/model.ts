import { Stock } from "../products/stockModel";
import { Role } from "./roles";

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

export enum ProductCategory {
    TSHIRT = "tshirt",
    BAG = "bag",
    BOOK = "book",
}

export interface ProductModel {
    productId: UUID;
    name: string;
    description: string;
    price: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface LocationModel {
    locationId: UUID;
    address: string;
}

export interface UserModel {
    userId: UUID;
    username: string;
    password: string;
    name: string;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
    token: string | null;
    tokenExpiresDate: Date | null;
}