import express, { Express, Request, response, Response, Router } from "express";
import swaggerUI from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import * as  OpenApiValidator from "express-openapi-validator";
import cookieParser from "cookie-parser";

import { initRouter } from "./router";
import { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";

// ------------------------------ Placeholder Database ------------------------------ //
const locationRepository = [
    {address: "location-1"},
    {address: "location-2"},
    {address: "location-3"},
];

const userRepository = [
    {
        username: "admin",
        password: "123",
        userId: "admin",
        role: "admin",
    },
    {
        username: "seller",
        password: "123",
        userId: "seller",
        role: "seller",
    },
    {
        username: "guest1",
        password: "123",
        userId: "guest-1",
        role: "none",
    },
    {
        username: "guest2",
        password: "123",
        userId: "guest-2",
        role: "none",
    }
]

const database: any = {
    findLocations() {
        return locationRepository;
    },
    addLocation(address: string) {
        const newLocation = {address: address};
        locationRepository.push(newLocation);
        return newLocation;
    },
    findSales() {
        return [];
    },
    createSale(ignore: any) {
        return ignore;
    },
    findUsers() {
        return [
            "user-1",
            "user-2"
        ]
    },
    createUser(ignore: any) {
        return ignore;
    },
    updateUser(userId: string, details: any) {
        console.log(userId, details);
    },
    getUserWithCredentials(username: string, password: string) {
        for (let user of userRepository) {
            if (user.username === username && user.password === password) {
                return user;
            }
        }
        
        return null;
    }
};

// -------------------------------------------------------------------------------- //
const app: Express = express();
const PORT: number = Number(process.env.PORT) || 8080;
const API_PATH = "/api/v1";

// OpenAPI documentation
const jsdocOptions = {
    definition: {
        "openapi": "3.0.2",
        "info": {
            "title": "IndieLisboa Stock Management",
            "description": "Web API to view/edit products stock, register sales and manage user accounts.",
            "version": "1.0.0"
        },
        "servers": [
            {
              "url": API_PATH
            }
        ],
        "tags": [
            {
              "name": "Auth",
              "description": "Register and Login"
            },
            {
              "name": "Locations",
              "description": "Location Management"
            },
            {
              "name": "Products",
              "description": "Stock Management"
            },
            {
              "name": "Sales",
              "description": "Sales Processing"
            },
            {
              "name": "Users",
              "description": "Accounts Management"
            }
          ],
        "paths": {
        "/products": {
            "get": {
            "tags": [
                "Products"
            ],
            "summary": "Get a list of products. You may specify search parameters.",
            "description": "When a parameter is used, only products with an **exact** match will be returned. When applicable, if a parameter has multiple values, returned products will match **at least one** of those values. \n\n Note: In this document, we've provided two of the possible tags for the category \"tshirt\". Be sure to check the detailed list of possible product categories and their associated tags at `/products/categories`.",
            "parameters": [
                {
                "name": "limit",
                "in": "query",
                "description": "Limit the number of products that are returned.",
                "schema": {
                    "type": "integer",
                    "format": "int32",
                    "minimum": 1,
                    "default": 10
                }
                },
                {
                "name": "page",
                "in": "query",
                "description": "Used for pagination. When **limit** is present, chunks of products will be skipped (e.g. if page=5 and limit=10, the first 50 products will be skipped).",
                "schema": {
                    "type": "integer",
                    "format": "int32",
                    "minimum": 0,
                    "default": 0
                }
                },
                {
                "name": "priceMin",
                "in": "query",
                "description": "Minimum price of the products.",
                "schema": {
                    "type": "number",
                    "format": "double",
                    "minimum": 0
                },
                "example": 0
                },
                {
                "name": "priceMax",
                "in": "query",
                "description": "Maximum price of the products.",
                "schema": {
                    "type": "number",
                    "format": "double"
                },
                "example": 200
                },
                {
                "name": "status",
                "in": "query",
                "description": "Availability status.",
                "schema": {
                    "$ref": "#/components/schemas/productStatus"
                },
                "style": "form",
                "explode": true,
                "example": [
                    "available"
                ]
                },
                {
                "name": "category",
                "in": "query",
                "description": "Product category.",
                "schema": {
                    "type": "string"
                },
                "example": "tshirt"
                },
                {
                "name": "logo",
                "in": "query",
                "description": "Tshirt logo.",
                "schema": {
                    "type": "array",
                    "items": {
                    "type": "string"
                    }
                },
                "style": "form",
                "explode": true,
                "example": [
                    "indie-2022-adult",
                    "indie-2022-junior"
                ]
                },
                {
                "name": "size",
                "in": "query",
                "description": "Tshirt size.",
                "schema": {
                    "type": "array",
                    "items": {
                    "type": "string"
                    }
                },
                "style": "form",
                "explode": true,
                "example": [
                    "s",
                    "m",
                    "l"
                ]
                }
            ],
            "responses": {
                "200": {
                "description": "Successfully returned a list of products that match the search criteria.",
                "content": {
                    "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                        "result": {
                            "type": "array",
                            "items": {
                            "type": "object"
                            },
                            "properties": {
                            "productId": {
                                "type": "string"
                            },
                            "name": {
                                "type": "string"
                            },
                            "price": {
                                "type": "number",
                                "format": "double"
                            },
                            "status": {
                                "$ref": "#/components/schemas/productStatus"
                            },
                            "image": {
                                "type": "string",
                                "format": "uri"
                            }
                            }
                        }
                        }
                    },
                    "example": {
                        "result": [
                        {
                            "productId": "product-1",
                            "name": "Product 1",
                            "price": 10,
                            "status": "available",
                            "image": "https://example.images.com/product-1-1"
                        },
                        {
                            "productId": "product-2",
                            "name": "Product 2",
                            "price": 5,
                            "status": "available",
                            "image": "https://example.images.com/product-2-1"
                        }
                        ]
                    }
                    }
                }
                },
                "400": {
                "$ref": "#/components/responses/400"
                },
                "403": {
                "$ref": "#/components/responses/403"
                },
                "500": {
                "$ref": "#/components/responses/500"
                }
            }
            }
        },
        "/products/categories": {
            "get": {
            "tags": [
                "Products"
            ],
            "summary": "Get a list of product categories and their associated tags.",
            "responses": {
                "200": {
                "description": "Successfully returned a list of all categories and their associated tags.",
                "content": {
                    "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                        "result": {
                            "type": "array",
                            "items": {
                            "type": "object",
                            "properties": {
                                "category": {
                                "type": "string"
                                },
                                "tags": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                    "name": {
                                        "type": "string"
                                    },
                                    "values": {
                                        "type": "array",
                                        "items": {
                                        "type": "string"
                                        }
                                    }
                                    }
                                }
                                }
                            }
                            }
                        }
                        }
                    },
                    "example": {
                        "result": [
                        {
                            "category": "tshirt",
                            "tags": [
                            {
                                "name": "size",
                                "values": [
                                "s",
                                "m",
                                "l"
                                ]
                            },
                            {
                                "name": "color",
                                "values": [
                                "blue",
                                "red",
                                "green"
                                ]
                            },
                            {
                                "name": "logo",
                                "values": [
                                "indie-2022-adult",
                                "indie-2022-junior"
                                ]
                            }
                            ]
                        },
                        {
                            "category": "bag",
                            "tags": [
                            {
                                "name": "year",
                                "values": [
                                "2018",
                                "2019",
                                "2020",
                                "2021"
                                ]
                            }
                            ]
                        }
                        ]
                    }
                    }
                }
                },
                "500": {
                "$ref": "#/components/responses/500"
                }
            }
            }
        },
        "/products/{productId}": {
            "parameters": [
            {
                "$ref": "#/components/parameters/productById"
            }
            ],
            "get": {
            "tags": [
                "Products"
            ],
            "summary": "Get detailed information of a product.",
            "description": "Unauthorized users don't have access to stock information. To view stock information for this product, be sure to provide a valid **authorization token** (User-Authentication cookie).",
            "security": [
                {
                "Cookie": []
                }
            ],
            "responses": {
                "200": {
                "description": "Successfully returned detailed information of a product.",
                "content": {
                    "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                        "result": {
                            "type": "object",
                            "properties": {
                            "productId": {
                                "type": "string"
                            },
                            "name": {
                                "type": "string"
                            },
                            "description": {
                                "type": "string"
                            },
                            "price": {
                                "type": "number",
                                "format": "double"
                            },
                            "active": {
                                "type": "boolean"
                            },
                            "status": {
                                "$ref": "#/components/schemas/productStatus"
                            },
                            "images": {
                                "type": "array",
                                "items": {
                                "type": "object",
                                "properties": {
                                    "default": {
                                    "type": "boolean"
                                    },
                                    "uri": {
                                    "type": "string",
                                    "format": "uri"
                                    }
                                }
                                }
                            },
                            "category": {
                                "type": "string"
                            },
                            "tags": {
                                "type": "object"
                            },
                            "stock": {
                                "type": "array",
                                "items": {
                                "type": "object",
                                "properties": {
                                    "locationId": {
                                    "type": "string"
                                    },
                                    "quantity": {
                                    "type": "integer",
                                    "format": "int32",
                                    "minimum": 0
                                    }
                                }
                                }
                            }
                            }
                        }
                        }
                    },
                    "example": {
                        "result": {
                        "productId": "product-1",
                        "name": "Product 1",
                        "description": "My first product",
                        "price": 10,
                        "active": true,
                        "status": "available",
                        "images": [
                            {
                            "default": true,
                            "uri": "https://example.images.com/product-1-1"
                            },
                            {
                            "default": false,
                            "uri": "https://example.images.com/product-1-2"
                            }
                        ],
                        "category": "tshirt",
                        "tags": {
                            "size": "m",
                            "color": "blue",
                            "logo": "indie-2022-adult"
                        },
                        "stock": [
                            {
                            "locationId": "location-1",
                            "quantity": 10
                            },
                            {
                            "locationId": "location-2",
                            "quantity": 20
                            }
                        ]
                        }
                    }
                    }
                }
                },
                "400": {
                "$ref": "#/components/responses/400"
                },
                "500": {
                "$ref": "#/components/responses/500"
                }
            }
            },
            "patch": {
            "tags": [
                "Products"
            ],
            "summary": "Update a product's details.",
            "security": [
                {
                "Cookie": []
                }
            ],
            "requestBody": {
                "description": "You may update any of the following product properties: `name`, `description`, `price` and `active`. If a property isn't specified, it won't be updated. Multiple properties may be updated at the same time. \n\n Note: to update product `stock` and `images` properties, you should use `/products/{id}/stock` and `/products/{id}/images`, respectively.",
                "content": {
                "application/json": {
                    "schema": {
                    "type": "object",
                    "properties": {
                        "name": {
                        "type": "string"
                        },
                        "description": {
                        "type": "string"
                        },
                        "price": {
                        "type": "number",
                        "format": "double",
                        "minimum": 0
                        },
                        "active": {
                        "type": "boolean"
                        }
                    }
                    },
                    "examples": {
                    "productUpdateName": {
                        "value": {
                        "name": "Product 1 (updated)"
                        }
                    },
                    "productUpdatePrice": {
                        "value": {
                        "price": 20
                        }
                    },
                    "productUpdateAll": {
                        "value": {
                        "name": "Product 1 (updated)",
                        "description": "My first product (updated)",
                        "price": 20,
                        "active": true
                        }
                    }
                    }
                }
                }
            },
            "responses": {
                "204": {
                "$ref": "#/components/responses/204"
                },
                "400": {
                "$ref": "#/components/responses/400"
                },
                "403": {
                "$ref": "#/components/responses/403"
                },
                "404": {
                "$ref": "#/components/responses/404"
                },
                "500": {
                "$ref": "#/components/responses/500"
                }
            }
            }
        },
        "/products/{productId}/stock": {
            "parameters": [
            {
                "$ref": "#/components/parameters/productById"
            }
            ],
            "patch": {
            "tags": [
                "Products"
            ],
            "summary": "Update a product's stock",
            "security": [
                {
                "Cookie": []
                }
            ],
            "requestBody": {
                "description": "Bulk update the stock of this product. Can also be used to add this product to new locations. If an existing location is omitted, its stock won't be changed.",
                "content": {
                "application/json": {
                    "schema": {
                    "type": "object",
                    "properties": {
                        "stock": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                            "locationId": {
                                "type": "string"
                            },
                            "quantity": {
                                "type": "integer",
                                "format": "int32"
                            }
                            }
                        }
                        }
                    }
                    },
                    "examples": {
                    "productUpdateStock": {
                        "value": {
                        "stock": [
                            {
                            "locationId": "location-1",
                            "quantity": 20
                            },
                            {
                            "locationId": "location-2",
                            "quantity": 10
                            }
                        ]
                        }
                    },
                    "productAddToLocation": {
                        "value": {
                        "stock": [
                            {
                            "locationId": "location-3",
                            "quantity": 30
                            }
                        ]
                        }
                    }
                    }
                }
                }
            },
            "responses": {
                "204": {
                "$ref": "#/components/responses/204"
                },
                "400": {
                "$ref": "#/components/responses/400"
                },
                "403": {
                "$ref": "#/components/responses/403"
                },
                "404": {
                "$ref": "#/components/responses/404"
                },
                "500": {
                "$ref": "#/components/responses/500"
                }
            }
            }
        },
        "/products/{productId}/images": {
            "parameters": [
            {
                "$ref": "#/components/parameters/productById"
            }
            ],
            "patch": {
            "tags": [
                "Products"
            ],
            "summary": "Update a product's images.",
            "security": [
                {
                "Cookie": []
                }
            ],
            "requestBody": {
                "description": "Bulk update the images of this product. Only one image may be set to `default`: \n\n - If none is selected, the first one will be set to default. \n\n - If multiple are selected, the first of those will be set to default. \n\n Note: omitting existing images will **delete** them.",
                "content": {
                "application/json": {
                    "schema": {
                    "type": "object",
                    "properties": {
                        "images": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                            "default": {
                                "type": "boolean",
                                "default": false
                            },
                            "uri": {
                                "type": "string",
                                "format": "uri"
                            }
                            }
                        }
                        }
                    }
                    },
                    "examples": {
                    "productUpdateImages": {
                        "value": {
                        "images": [
                            {
                            "default": false,
                            "uri": "https://example.images.com/product-1-1"
                            },
                            {
                            "default": true,
                            "uri": "https://example.images.com/product-1-2"
                            },
                            {
                            "default": false,
                            "uri": "https://example.images.com/product-1-3"
                            }
                        ]
                        }
                    }
                    }
                }
                }
            },
            "responses": {
                "204": {
                "$ref": "#/components/responses/204"
                },
                "400": {
                "$ref": "#/components/responses/400"
                },
                "403": {
                "$ref": "#/components/responses/403"
                },
                "404": {
                "$ref": "#/components/responses/404"
                },
                "500": {
                "$ref": "#/components/responses/500"
                }
            }
            }
        },
        "/sales": {
            "get": {
            "tags": [
                "Sales"
            ],
            "summary": "Get a list of past sales. You may specify search parameters.",
            "description": "When a parameter is present, only sales with an **exact** match will be returned.",
            "security": [
                {
                "Cookie": []
                }
            ],
            "parameters": [
                {
                "name": "limit",
                "in": "query",
                "description": "Limit the number of sales that are returned.",
                "schema": {
                    "type": "integer",
                    "format": "int32",
                    "minimum": 1,
                    "default": 10
                }
                },
                {
                "name": "page",
                "in": "query",
                "description": "Used for pagination. When **limit** is present, chunks of sales will be skipped (e.g. if page=5 and limit=10, the first 50 sales will be skipped).",
                "schema": {
                    "type": "integer",
                    "format": "int32",
                    "minimum": 0,
                    "default": 0
                }
                },
                {
                "name": "dateStart",
                "in": "query",
                "description": "Sales after this date (inclusive).",
                "schema": {
                    "type": "string",
                    "format": "date-time"
                },
                "example": "2022-01-01T00:00:00Z"
                },
                {
                "name": "dateEnd",
                "in": "query",
                "description": "Sales before this date (inclusive).",
                "schema": {
                    "type": "string",
                    "format": "date-time"
                },
                "example": "2022-12-31T00:00:00Z"
                },
                {
                "name": "sellerId",
                "in": "query",
                "description": "Sales by this seller.",
                "schema": {
                    "type": "string"
                },
                "example": "user-1"
                },
                {
                "name": "productId",
                "in": "query",
                "description": "Sales with this product.",
                "schema": {
                    "type": "string"
                },
                "example": "product-1"
                },
                {
                "name": "locationId",
                "in": "query",
                "description": "Sales at this location.",
                "schema": {
                    "type": "string"
                },
                "example": "location-1"
                }
            ],
            "responses": {
                "200": {
                "description": "Successfully returned a list of sales.",
                "content": {
                    "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                        "result": {
                            "type": "array",
                            "items": {
                            "type": "object",
                            "properties": {
                                "saleId": {
                                "type": "string"
                                },
                                "date": {
                                "type": "string",
                                "format": "date-time"
                                },
                                "sellerId": {
                                "type": "string"
                                },
                                "totalPrice": {
                                "type": "number",
                                "format": "double"
                                },
                                "list": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                    "productId": {
                                        "type": "string"
                                    },
                                    "locationId": {
                                        "type": "string"
                                    },
                                    "quantity": {
                                        "type": "integer",
                                        "format": "int32",
                                        "minimum": 1
                                    }
                                    }
                                }
                                }
                            }
                            }
                        }
                        }
                    },
                    "example": {
                        "result": [
                        {
                            "saleId": "sale-1",
                            "date": "2022-01-01T17:00:00Z",
                            "totalPrice": 10,
                            "sellerId": "user-1",
                            "list": [
                            {
                                "productId": "product-1",
                                "locationId": "location-1",
                                "quantity": 1
                            }
                            ]
                        },
                        {
                            "saleId": "sale-2",
                            "date": "2022-01-02T17:00:00Z",
                            "totalPrice": 50,
                            "sellerId": "user-1",
                            "list": [
                            {
                                "productId": "product-1",
                                "locationId": "location-1",
                                "quantity": 1
                            },
                            {
                                "productId": "product-2",
                                "locationId": "location-1",
                                "quantity": 2
                            }
                            ]
                        }
                        ]
                    }
                    }
                }
                },
                "400": {
                "$ref": "#/components/responses/400"
                },
                "403": {
                "$ref": "#/components/responses/403"
                },
                "500": {
                "$ref": "#/components/responses/500"
                }
            }
            },
            "post": {
            "tags": [
                "Sales"
            ],
            "summary": "Create a new sale.",
            "security": [
                {
                "Cookie": []
                }
            ],
            "requestBody": {
                "required": true,
                "content": {
                "application/json": {
                    "schema": {
                    "type": "object",
                    "properties": {
                        "sellerId": {
                        "type": "string"
                        },
                        "totalPrice": {
                        "type": "number",
                        "format": "double",
                        "minimum": 0
                        },
                        "list": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                            "productId": {
                                "type": "string"
                            },
                            "locationId": {
                                "type": "string"
                            },
                            "quantity": {
                                "type": "integer",
                                "format": "int32",
                                "minimum": 1
                            }
                            }
                        }
                        }
                    }
                    },
                    "example": {
                    "sellerId": "user-1",
                    "totalPrice": 50,
                    "list": [
                        {
                        "productId": "product-1",
                        "locationId": "location-1",
                        "quantity": 1
                        },
                        {
                        "productId": "product-2",
                        "locationId": "location-1",
                        "quantity": 2
                        }
                    ]
                    }
                }
                }
            },
            "responses": {
                "201": {
                "description": "Successfully created a new sale.",
                "content": {
                    "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                        "result": {
                            "type": "object",
                            "properties": {
                            "saleId": {
                                "type": "string"
                            },
                            "date": {
                                "type": "string",
                                "format": "date-time"
                            },
                            "sellerId": {
                                "type": "string"
                            },
                            "totalPrice": {
                                "type": "number",
                                "format": "double",
                                "minimum": 0
                            },
                            "list": {
                                "type": "array",
                                "items": {
                                "type": "object",
                                "properties": {
                                    "productId": {
                                    "type": "string"
                                    },
                                    "locationId": {
                                    "type": "string"
                                    },
                                    "quantity": {
                                    "type": "integer",
                                    "format": "int32",
                                    "minimum": 1
                                    }
                                }
                                }
                            }
                            }
                        }
                        }
                    },
                    "example": {
                        "result": {
                        "saleId": "sale-2",
                        "date": "2022-01-02T17:00:00Z",
                        "totalPrice": 50,
                        "sellerId": "user-1",
                        "list": [
                            {
                            "productId": "product-1",
                            "locationId": "location-1",
                            "quantity": 1
                            },
                            {
                            "productId": "product-2",
                            "locationId": "location-1",
                            "quantity": 2
                            }
                        ]
                        }
                    }
                    }
                }
                },
                "400": {
                "$ref": "#/components/responses/400"
                },
                "403": {
                "$ref": "#/components/responses/403"
                },
                "500": {
                "$ref": "#/components/responses/500"
                }
            }
            }
        },
        "/users": {
            "get": {
            "tags": [
                "Users"
            ],
            "summary": "Get a list of user accounts.",
            "security": [
                {
                "Cookie": []
                }
            ],
            "parameters": [
                {
                "name": "role",
                "in": "query",
                "schema": {
                    "$ref": "#/components/schemas/userRoles"
                },
                "example": "seller"
                }
            ],
            "responses": {
                "200": {
                "description": "Successfully returned a list of user accounts",
                "content": {
                    "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                        "result": {
                            "type": "array",
                            "items": {
                            "type": "string"
                            }
                        }
                        }
                    },
                    "example": {
                        "result": [
                        "user-1",
                        "user-2"
                        ]
                    }
                    }
                }
                },
                "400": {
                "$ref": "#/components/responses/400"
                },
                "403": {
                "$ref": "#/components/responses/403"
                },
                "500": {
                "$ref": "#/components/responses/500"
                }
            }
            },
            "post": {
            "tags": [
                "Users",
                "Auth"
            ],
            "summary": "Create a new user account.",
            "requestBody": {
                "description": "",
                "content": {
                "application/json": {
                    "schema": {
                    "type": "object",
                    "properties": {
                        "email": {
                        "type": "string",
                        "format": "email"
                        },
                        "name": {
                        "type": "string"
                        }
                    }
                    },
                    "example": {
                    "email": "alice@mail.com",
                    "name": "Alice"
                    }
                }
                },
                "required": true
            },
            "responses": {
                "201": {
                "description": "Successfully created a new user account.",
                "content": {
                    "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                        "result": {
                            "type": "object",
                            "properties": {
                            "userId": {
                                "type": "string"
                            },
                            "email": {
                                "type": "string",
                                "format": "email"
                            },
                            "name": {
                                "type": "string"
                            },
                            "role": {
                                "$ref": "#/components/schemas/userRoles"
                            }
                            }
                        }
                        }
                    },
                    "example": {
                        "result": {
                        "userId": "user1",
                        "email": "alice@mail.com",
                        "name": "Alice",
                        "role": "none"
                        }
                    }
                    }
                }
                },
                "400": {
                "$ref": "#/components/responses/400"
                },
                "500": {
                "$ref": "#/components/responses/500"
                }
            }
            }
        },
        "/users/{userId}": {
            "parameters": [
            {
                "$ref": "#/components/parameters/userById"
            }
            ],
            "get": {
            "tags": [
                "Users"
            ],
            "summary": "Get user details.",
            "description": "",
            "security": [
                {
                "Cookie": []
                }
            ],
            "responses": {
                "200": {
                "description": "Successfully returned the user's details.",
                "content": {
                    "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                        "result": {
                            "type": "object",
                            "properties": {
                            "userId": {
                                "type": "string"
                            },
                            "email": {
                                "type": "string",
                                "format": "email"
                            },
                            "name": {
                                "type": "string"
                            },
                            "role": {
                                "$ref": "#/components/schemas/userRoles"
                            }
                            }
                        }
                        }
                    },
                    "example": {
                        "result": {
                        "userId": "user1",
                        "email": "alice@mail.com",
                        "name": "Alice",
                        "role": "none"
                        }
                    }
                    }
                }
                },
                "403": {
                "$ref": "#/components/responses/403"
                },
                "404": {
                "$ref": "#/components/responses/404"
                },
                "500": {
                "$ref": "#/components/responses/500"
                }
            }
            },
            "patch": {
            "tags": [
                "Users"
            ],
            "summary": "Update user details.",
            "security": [
                {
                "Cookie": []
                }
            ],
            "requestBody": {
                "description": "Change this user's details. The user may edit their own details, except their role. Users with an 'admin' role may also change any user's details.",
                "content": {
                "application/json": {
                    "schema": {
                    "type": "object",
                    "properties": {
                        "email": {
                        "type": "string",
                        "format": "email"
                        },
                        "name": {
                        "type": "string"
                        },
                        "role": {
                        "$ref": "#/components/schemas/userRoles"
                        }
                    }
                    },
                    "examples": {
                    "userUpdateName": {
                        "value": {
                        "name": "Alice Benedict"
                        }
                    },
                    "userUpdateEmail": {
                        "value": {
                        "email": "alice.benedict@mail.com"
                        }
                    },
                    "userUpdateRole": {
                        "value": {
                        "role": "seller"
                        }
                    }
                    }
                }
                }
            },
            "responses": {
                "204": {
                "$ref": "#/components/responses/204"
                },
                "400": {
                "$ref": "#/components/responses/400"
                },
                "403": {
                "$ref": "#/components/responses/403"
                },
                "404": {
                "$ref": "#/components/responses/404"
                },
                "500": {
                "$ref": "#/components/responses/500"
                }
            }
            }
        },
        "/locations": {
            "get": {
            "tags": [
                "Locations"
            ],
            "summary": "Get a list of available point of sale locations.",
            "responses": {
                "200": {
                "description": "Successfully returned a list of locations.",
                "content": {
                    "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                        "result": {
                            "type": "array",
                            "items": {
                            "type": "object",
                            "properties": {
                                "address": {
                                    "type": "string"
                                }
                            }
                            }
                        }
                        }
                    },
                    "example": {
                        "result": [
                        "location-1",
                        "location-2",
                        "location-3"
                        ]
                    }
                    }
                }
                },
                "500": {
                "$ref": "#/components/responses/500"
                }
            }
            },
            "post": {
            "tags": [
                "Locations"
            ],
            "summary": "Create a new point of sale location.",
            "security": [
                {
                "Cookie": []
                }
            ],
            "requestBody": {
                "description": "",
                "required": true,
                "content": {
                "application/json": {
                    "schema": {
                    "type": "object",
                    "properties": {
                        "address": {
                        "type": "string"
                        }
                    }
                    },
                    "example": {
                    "address": "Location 1"
                    }
                }
                }
            },
            "responses": {
                "201": {
                "description": "Successfully created a new point of sale.",
                "content": {
                    "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                        "result": {
                            "type": "object",
                            "properties": {
                            "locationId": {
                                "type": "string"
                            },
                            "address": {
                                "type": "string"
                            }
                            }
                        }
                        }
                    },
                    "example": {
                        "result": {
                        "locationId": "location-1",
                        "address": "Location 1"
                        }
                    }
                    }
                }
                },
                "400": {
                "$ref": "#/components/responses/400"
                },
                "403": {
                "$ref": "#/components/responses/403"
                },
                "500": {
                "$ref": "#/components/responses/500"
                }
            }
            }
        },
        "/auth/register": {
            "post": {
            "tags": [
                "Users",
                "Auth"
            ],
            "summary": "Create a new user account.",
            "requestBody": {
                "description": "",
                "content": {
                "application/json": {
                    "schema": {
                    "type": "object",
                    "properties": {
                        "email": {
                        "type": "string",
                        "format": "email"
                        },
                        "name": {
                        "type": "string"
                        }
                    }
                    },
                    "example": {
                    "email": "alice@mail.com",
                    "name": "Alice"
                    }
                }
                },
                "required": true
            },
            "responses": {
                "201": {
                "description": "Successfully created a new user account.",
                "content": {
                    "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                        "result": {
                            "type": "object",
                            "properties": {
                            "userId": {
                                "type": "string"
                            },
                            "email": {
                                "type": "string",
                                "format": "email"
                            },
                            "name": {
                                "type": "string"
                            },
                            "role": {
                                "$ref": "#/components/schemas/userRoles"
                            }
                            }
                        }
                        }
                    },
                    "example": {
                        "result": {
                        "userId": "user1",
                        "email": "alice@mail.com",
                        "name": "Alice",
                        "role": "none"
                        }
                    }
                    }
                }
                },
                "400": {
                "$ref": "#/components/responses/400"
                },
                "500": {
                "$ref": "#/components/responses/500"
                }
            }
            }
        },
        "/auth/login": {
            "post": {
            "tags": [
                "Auth"
            ],
            "summary": "User login.",
            "responses": {
                "204": {
                "$ref": "#/components/responses/204"
                },
                "400": {
                "$ref": "#/components/responses/400"
                },
                "500": {
                "$ref": "#/components/responses/500"
                }
            }
            }
        }
        },
        "components": {
            "parameters": {
                "productById": {
                "name": "productId",
                "in": "path",
                "required": true,
                "schema": {
                    "type": "string",
                    "example": "product-1"
                }
                },
                "userById": {
                "name": "userId",
                "in": "path",
                "required": true,
                "schema": {
                    "type": "string",
                    "example": "user-alice"
                }
                }
            },
            "schemas": {
                "productStatus": {
                "type": "array",
                "items": {
                    "type": "string",
                    "enum": [
                    "available",
                    "last units",
                    "sold out",
                    "no info"
                    ]
                }
                },
                "userRoles": {
                "type": "string",
                "enum": [
                    "admin",
                    "seller",
                    "none"
                ]
                },
                "error": {
                "type": "object",
                "properties": {
                    "code": {
                    "type": "integer",
                    "format": "int32",
                    "example": 0
                    },
                    "name": {
                    "type": "string",
                    "example": "error_0_name"
                    },
                    "description": {
                    "type": "string",
                    "example": "This is the error description."
                    }
                }
                }
            },
            "responses": {
                "204": {
                "description": "No Content"
                },
                "400": {
                "description": "Bad Request",
                "content": {
                    "application/json": {
                    "schema": {
                        "$ref": "#/components/schemas/error"
                    },
                    "example": {
                        "error": {
                        "code": 400,
                        "name": "bad_request",
                        "description": "The request format is invalid."
                        }
                    }
                    }
                }
                },
                "403": {
                "description": "Forbidden",
                "content": {
                    "application/json": {
                    "schema": {
                        "$ref": "#/components/schemas/error"
                    },
                    "example": {
                        "error": {
                        "code": 403,
                        "name": "forbidden",
                        "description": "Not enough permissions for this action."
                        }
                    }
                    }
                }
                },
                "404": {
                "description": "Not Found",
                "content": {
                    "application/json": {
                    "schema": {
                        "$ref": "#/components/schemas/error"
                    },
                    "example": {
                        "error": {
                        "code": 404,
                        "name": "404_error",
                        "description": "Resource not found."
                        }
                    }
                    }
                }
                },
                "500": {
                "description": "Internal Server Error",
                "content": {
                    "application/json": {
                    "schema": {
                        "$ref": "#/components/schemas/error"
                    },
                    "example": {
                        "error": {
                        "code": 500,
                        "name": "internal_server_error",
                        "description": "Unspecified error. Something went wrong."
                        }
                    }
                    }
                }
                }
            },
            "securitySchemes": {
                "Cookie": {
                "type": "apiKey",
                "in": "cookie",
                "name": "User-Authentication"
                },
                "OpenID": {
                "type": "openIdConnect",
                "openIdConnectUrl": "https://placeholder.org"
                }
            }
        }
    },
    apis: ["./router.ts"],
}

const OPENNAPI_SPECIFICATION = swaggerJsdoc(jsdocOptions);
const API_ROUTER = initRouter(database);

// JSON middleware
app.use(express.json());

// Cookie parser middleware
app.use(cookieParser());

// OpenAPI validator
app.use(OpenApiValidator.middleware({
    apiSpec: OPENNAPI_SPECIFICATION as OpenAPIV3.Document,
    validateRequests: {
        allowUnknownQueryParameters: true,
    },
    validateResponses: true
}));
app.use((error: Error, req: Request, res: Response, next: Function) => {
    console.error(error);
    res.sendStatus(500);
});

// Documentation routes
app.get("/api-docs/openapi.json", (request: Request, response: Response) => {
    response.status(200);
    response.json(OPENNAPI_SPECIFICATION);
    response.end();
});
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(OPENNAPI_SPECIFICATION));

// API Routes
app.use(API_PATH, API_ROUTER);

// Start server
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});