import { Association, BelongsToGetAssociationMixin, CreationOptional, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model, NonAttribute, Sequelize } from "sequelize";
import { ProductCategory } from "../../common/model";
import { registerAssociations, registerModel } from "../../sequelize";
import { CATEGORY_FK, Product } from "../productModel";

export enum BagColour {
    RED = "red",
    GREEN = "green", 
    BLUE = "blue",
    WHITE = "white",
    BLACK = "black",
}

export interface BookModel {
    productId: Product["productId"];
    title: string;
    author: string;
    publisher: string;
    year: string;
}

const BOOK_UNIQUE_CONSTRAINT = "product_book_unique";

export class Book extends Model<InferAttributes<Book>, InferCreationAttributes<Book>> implements BookModel {
    declare productId: ForeignKey<Product["productId"]>;
    declare title: string;
    declare author: CreationOptional<string>;
    declare publisher: CreationOptional<string>;
    declare year: CreationOptional<string>;

    /** Retrieve the associated product */
    declare getProduct: BelongsToGetAssociationMixin<Product>

    // Eager loaded property.
    declare product?: NonAttribute<Product>

    declare static associations: {
        product: Association<Book, Product>
    }
}

registerModel(initBookModel);
registerAssociations(initBookAssociations);

async function initBookModel(sequelize: Sequelize): Promise<void> {
    Book.init(
        {
            productId: {
                type: DataTypes.UUID,
                primaryKey: true,
            },
            title: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: BOOK_UNIQUE_CONSTRAINT
            },
            author: {
                type: DataTypes.STRING,
                unique: BOOK_UNIQUE_CONSTRAINT
            },
            publisher: {
                type: DataTypes.STRING,
                unique: BOOK_UNIQUE_CONSTRAINT
            },
            year: {
                type: DataTypes.STRING,
                unique: BOOK_UNIQUE_CONSTRAINT
            },
        },
        {
            sequelize: sequelize,
            tableName: ProductCategory.BOOK,
            timestamps: false,
        }
    )
}

async function initBookAssociations(): Promise<void> {
    Book.belongsTo(Product, {
        foreignKey: CATEGORY_FK,
        as: "product"
    });
}