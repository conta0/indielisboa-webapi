import { Association, BelongsToManyAddAssociationMixin, BelongsToManyGetAssociationsMixin, CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, NonAttribute, Sequelize, UUIDV4 } from "sequelize";
import { LocationModel, UUID } from "../common/model";
import { Product } from "../products/productModel";
import { STOCK_LOCATION_FK, STOCK_PRODUCT_FK, Stock } from "../products/stockModel";
import { registerAssociations, registerModel } from "../sequelize";

registerModel(initLocationModel);
registerAssociations(initLocationAssociations);

export class Location extends Model<InferAttributes<Location>, InferCreationAttributes<Location>> implements LocationModel {
    declare locationId: CreationOptional<UUID>;
    declare address: string;

    declare products?: NonAttribute<Product[]>
    declare getProducts: BelongsToManyGetAssociationsMixin<Product>;
    declare addProduct: BelongsToManyAddAssociationMixin<Product, Product["productId"]>

    declare static associations: {
        products: Association<Location, Product>
    }
}

async function initLocationModel(sequelize: Sequelize): Promise<void> {
    Location.init(
        {
            locationId: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: UUIDV4,
                validate:{
                    isUUID: 4
                }
            },
            address: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false
            },
        },
        {
            timestamps: false,
            sequelize: sequelize,
            tableName: "location",
        }
    )
}

async function initLocationAssociations(): Promise<void> {
    Location.belongsToMany(Product, {
        through: Stock,
        as: "products",
        foreignKey: STOCK_LOCATION_FK,
        otherKey: STOCK_PRODUCT_FK
    });

    Location.hasMany(Stock, {foreignKey: STOCK_LOCATION_FK});
}