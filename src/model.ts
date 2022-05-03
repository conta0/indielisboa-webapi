export type Product = {
    id: string,
}

export type Location = {
    address: string,
};

export type Stock = {
    product: string,
    location: string,
    quantity: number,
}

export type SaleItem = {
    product: string,
    location: string,
    quantity: number,
}

export type Sale = {
    id: string,
    seller: string,
    totalPrice: number,
    list: Array<SaleItem>,
};

export type User = {
    email: string,
    name: string,
    role: number,
}