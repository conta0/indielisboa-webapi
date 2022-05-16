/**
 * Information necessary to create a new sale.
 * 
 * @example {
 *  "sellerId": "user-1",
 *  "list": [
 *      {
 *          "productId": "product-1",
 *          "locationId": "location-1",
 *          "quantity": 5
 *      }
 *  ]
 * }
 */
 export interface CreateSaleParams {
    sellerId: string,
    list: CreateSaleItemParams[]
}

export interface CreateSaleItemParams {
    productId: string,
    locationId: string,
    /**
     * @isInt Must be an integer >= 1. 
     * @minimum 1 Minimum 1
     */
    quantity: number
}