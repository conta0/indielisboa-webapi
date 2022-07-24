import { Transaction } from "sequelize";
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

// Callback signature for the sequelize.transaction() function.
export type SequelizeTransactionCallback<T> = (t: Transaction) => Promise<T>

/**
 * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
 * @format uuid
 */
export type UUID = string

export const USERNAME_PATTERN = /^[A-Za-z][\w]{4,19}$/i
export const PASSWORD_PATTERN = /^[\w]{8,19}$/i

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
