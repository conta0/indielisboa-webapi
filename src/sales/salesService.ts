import { Sale } from "../model/sales"
import { CreateSaleParams } from "./salesDtos";
import { ServiceResult } from "../common/interfaces";

export class SalesService {
    public getSales(): Sale[] {
        return [];
    }

    public createSale(params: CreateSaleParams): ServiceResult<Sale> {
        return {
            "result": {
                "saleId": "sale-1",
                "date": "",
                "sellerId": "user-1",
                "totalPrice": 50,
                "list": [
                    {
                        "productId": "product-1",
                        "locationId": "location-1",
                        "quantity": 5,
                        "price": 10
                    }
                ]
            }
        };
    }
}