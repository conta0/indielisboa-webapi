/** A product's category */
export enum ProductCategory {
    TSHIRT = "tshirt",
    BAG = "bag",
    BOOK = "book",
}


/**
 * Pass: [0.00, 0.99, 1234.00]
 * Fail: [0, 1234, 12345.00, 00.00] 
 * @format ^(0|[1-9]\d{0,3})\.\d\d$
 */
export type Price = string;