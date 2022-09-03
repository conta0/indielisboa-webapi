/** A product's category */
export enum ProductCategory {
    TSHIRT = "tshirt",
    BAG = "bag",
    BOOK = "book",
}

/**
 * Product price in Euro cents.
 * 
 * @minimum 0 minimum 0.
 * @maximum 200000 maximum 200000.
 * @isInt
 */
export type Price = number;