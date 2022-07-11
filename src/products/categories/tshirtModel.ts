import { Association, BelongsToGetAssociationMixin, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model, NonAttribute, Sequelize } from "sequelize";
import { ProductCategory } from "../../common/model";
import { registerAssociations, registerModel } from "../../sequelize";
import { CATEGORY_FK, Product } from "../productModel";

export enum TshirtSize {
    KID = "kid",
    XS = "xs",
    S = "s",
    M = "m",
    L = "l",
    XL = "xl"
}

export enum TshirtColour {
    RED = "red",
    GREEN = "green",
    BLUE = "blue",
    YELLOW = "yellow",
    ORANGE = "orange",
    PURPLE = "purple",
}

export interface TshirtModel {
    productId: Product["productId"];
    size: TshirtSize;
    colour: TshirtColour;
    design: string;
}

export class Tshirt extends Model<InferAttributes<Tshirt>, InferCreationAttributes<Tshirt>> implements TshirtModel {
    declare productId: ForeignKey<Product["productId"]>;
    declare size: TshirtSize;
    declare colour: TshirtColour;
    declare design: string;

    /** Retrieve the associated product */
    declare getProduct: BelongsToGetAssociationMixin<Product>

    // Eager loaded property.
    declare product?: NonAttribute<Product>

    declare static associations: {
        product: Association<Tshirt, Product>
    }
}

registerModel(initTshirtModel);
registerAssociations(initTshirtAssociations);

const TSHIRT_UNIQUE_CONSTRAINT = "product_tshirt_unique";

async function initTshirtModel(sequelize: Sequelize): Promise<void> {
    Tshirt.init(
        {
            productId: {
                type: DataTypes.UUID,
                primaryKey: true,
            },
            size: {
                type: DataTypes.ENUM,
                allowNull: false,
                values: Object.values(TshirtSize),
                unique: TSHIRT_UNIQUE_CONSTRAINT,
            },
            colour: {
                type: DataTypes.ENUM,
                allowNull: false,
                values: Object.values(TshirtColour),
                unique: TSHIRT_UNIQUE_CONSTRAINT,
            },
            design: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: TSHIRT_UNIQUE_CONSTRAINT,
            },
        },
        {
            sequelize: sequelize,
            tableName: ProductCategory.TSHIRT,
            timestamps: false,
        }
    )
}

async function initTshirtAssociations(): Promise<void> {
    Tshirt.belongsTo(Product, {
        foreignKey: CATEGORY_FK,
        as: "product",
    });
}