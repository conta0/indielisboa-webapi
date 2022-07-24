import { Association, BelongsToManyAddAssociationMixin, BelongsToManyGetAssociationsMixin, CreationOptional, DataTypes, FindAttributeOptions, FindOptions, HasManyGetAssociationsMixin, HasOneCreateAssociationMixin, HasOneGetAssociationMixin, Includeable, InferAttributes, InferCreationAttributes, Model, NonAttribute, Sequelize, Transaction, UUIDV4 } from "sequelize";
import { ProductModel, UUID } from "../common/model";
import { Location } from "../locations/locationsService";
import { registerAssociations, registerModel } from "../sequelize";
import { Bag } from "./categories/bagModel";
import { Book } from "./categories/bookModel";
import { Tshirt } from "./categories/tshirtModel";
import { Stock, STOCK_LOCATION_FK, STOCK_PRODUCT_FK } from "./stockModel";
import { ProductCategory } from "./types";

export const CATEGORY_FK = "productId"; 

export class Product extends Model<InferAttributes<Product>, InferCreationAttributes<Product>> implements ProductModel {
    declare productId: CreationOptional<UUID>;
    declare name: string;
    declare description: string;
    declare price: number;
    declare category: ProductCategory;
    declare active: CreationOptional<boolean>;
    declare createdAt: NonAttribute<Date>;
    declare updatedAt: NonAttribute<Date>;

    /** Retrieve the product's locations. */
    declare getLocations: BelongsToManyGetAssociationsMixin<Location>;
    /** Associate this product to a location. */
    declare addLocation: BelongsToManyAddAssociationMixin<Location, Location["locationId"]>;
    /** Retrieve the product's stock */
    declare getStocks: HasManyGetAssociationsMixin<Stock>
    
    // The following functions pertain to a product's category. Only one of those must be called and exactly one time.
    // Even though each Product instance will have all of the below
    // the bussiness rule states that each product must have exactly one category.
    // Sequelize doesn't provide a clean way to implement a "IS-A" relationship, so it's our responsibility
    // to ensure this rule isn's broken (i.e., a product always has one category and it never changes).

    /** Create this product as a Tshirt */
    declare createTshirt: HasOneCreateAssociationMixin<Tshirt>;
    /** Retrieve the Tshirt info */
    declare getTshirt: HasOneGetAssociationMixin<Tshirt>
    /** Create this product as a Bag */
    declare createBag: HasOneCreateAssociationMixin<Bag>;
    /** Retrieve the Bag info */
    declare getBag: HasOneGetAssociationMixin<Bag>
    /** Create this product as a Book */
    declare createBook: HasOneCreateAssociationMixin<Book>;
    /** Retrieve the Book info */
    declare getBook: HasOneGetAssociationMixin<Book>;

    // Eager loaded properties.
    declare locations?: NonAttribute<Location[]>;
    declare stock?: NonAttribute<Stock[]>;
    declare tshirt?: NonAttribute<Tshirt>;
    declare bag?: NonAttribute<Bag>;
    declare book?: NonAttribute<Book>;

    declare static associations: {
        locations: Association<Product, Location>;
        stock: Association<Product, Stock>;
        tshirt: Association<Product, Tshirt>;
        bag: Association<Product, Bag>;
        book: Association<Product, Book>;
    }

    /**
     * A wrapper function that will retrieve this product's tags, should they exist. 
     * 
     * @param transaction The transaction in which the query will run.
     * @returns A promise to be either resolved with the Product's tags or rejected with an Error.
     */
    async getCategoryTags(transaction?: Transaction){
        // Let's exclude the "productId" because it's a foreign key to this instance.
        const options: FindOptions = {attributes: {exclude: ["productId"]}, transaction: transaction};
        switch(this.category) {
            case ProductCategory.TSHIRT:
                return this.getTshirt(options);
            case ProductCategory.BAG:
                return this.getBag(options);
            case ProductCategory.BOOK:
                return this.getBook(options);
        }
    }
}

registerModel(initProductModel);
registerAssociations(initProductAssociations);

async function initProductModel(sequelize: Sequelize): Promise<void> {
    Product.init(
        {
            productId: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: UUIDV4,
                validate: {
                    isUUID: 4
                }
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            price: {
                type: DataTypes.REAL,
                allowNull: false,
                validate: {
                    min: 0
                }
            },
            category: {
                type: DataTypes.ENUM,
                allowNull: false,
                values: Object.values(ProductCategory)
            },
            active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
            }
        },
        {
            sequelize: sequelize,
            tableName: "product",
            timestamps: true,
        }
    )
}

async function initProductAssociations(): Promise<void> {
    Product.belongsToMany(Location, {
        through: Stock, 
        foreignKey: STOCK_PRODUCT_FK,
        otherKey: STOCK_LOCATION_FK,
        as: "locations",
    })
    
    Product.hasMany(Stock, {
        foreignKey: STOCK_PRODUCT_FK,
        as: "stock",
    });

    Product.hasOne(Tshirt, {
        foreignKey: CATEGORY_FK,
        as: "tshirt"
    })

    Product.hasOne(Bag, {
        foreignKey: CATEGORY_FK,
        as: "bag"
    })

    Product.hasOne(Book, {
        foreignKey: CATEGORY_FK,
        as: "book"
    })
}