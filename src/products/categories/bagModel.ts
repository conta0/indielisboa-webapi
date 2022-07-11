import { Association, BelongsToGetAssociationMixin, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model, NonAttribute, Sequelize } from "sequelize";
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

export interface BagModel {
    productId: Product["productId"];
    design: string;
    colour: BagColour;
}

const BAG_UNIQUE_CONSTRAINT = "product_bag_unique";

export class Bag extends Model<InferAttributes<Bag>, InferCreationAttributes<Bag>> implements BagModel {
    declare productId: ForeignKey<Product["productId"]>;
    declare colour: BagColour;
    declare design: string;

    /** Retrieve the associated product */
    declare getProduct: BelongsToGetAssociationMixin<Product>

    // Eager loaded property.
    declare product?: NonAttribute<Product>

    declare static associations: {
        product: Association<Bag, Product>
    }
}

registerModel(initBagModel);
registerAssociations(initBagAssociations);

async function initBagModel(sequelize: Sequelize): Promise<void> {
    Bag.init(
        {
            productId: {
                type: DataTypes.UUID,
                primaryKey: true,
            },
            colour: {
                type: DataTypes.ENUM,
                allowNull: false,
                values: Object.values(BagColour),
                unique: BAG_UNIQUE_CONSTRAINT
            },
            design: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: BAG_UNIQUE_CONSTRAINT
            },
        },
        {
            sequelize: sequelize,
            tableName: ProductCategory.BAG,
            timestamps: false,
        }
    )
}

async function initBagAssociations(): Promise<void> {
    Bag.belongsTo(Product, {
        foreignKey: CATEGORY_FK,
        as: "product"
    });
}