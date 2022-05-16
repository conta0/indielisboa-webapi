/**
 * Information about a sold product.
 * 
 * @example {
 *  "productId": "product-1",
 *  "locationId": "location-1",
 *  "quantity": 5,
 *  "price": 10
 * }
 * */
 export interface SaleItem {
    productId: string,
    locationId: string,
    /** @isInt @minimum 1 */
    quantity: number,
    /** @minimum 0 */
    price: number
}

/**
 * Information about a sale.
 * 
 * @param saleId Sale identifier
 * @param date The Sale date
 * @param sellerId User that completed this sale
 * @param totalPrice Total price of the sale
 * @param list List of product of this sale
 * 
 * @example {
 *  "saleId": "sale-1",
 *  "date": "2022-12-31T00:00:00Z",
 *  "sellerId": "user-1",
 *  "totalPrice": 50,
 *  "list": [
 *      {
 *          "productId": "product-1",
 *          "locationId": "location-1",
 *          "quantity": 5,
 *          "price": 10
 *      }
 *  ]
 * }
 */
export interface Sale {
    saleId: string,
    /** @isDateTime */
    date: string,
    sellerId: string,
    totalPrice: number,
    list: SaleItem[]
}