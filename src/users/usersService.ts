import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, NonAttribute, Sequelize, UUIDV4 } from "sequelize";
import { Password, UserModel, Username } from "../common/model";
import { registerAssociations, registerModel } from "../sequelize";
import { Role } from "../common/roles";

registerModel(initUserModel);
registerAssociations(initUserAssociations);

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> implements UserModel {
    declare userId: CreationOptional<string>;
    declare username: Username;
    declare password: Password;
    declare name: string;
    declare role: Role;
    declare createdAt: NonAttribute<Date>;
    declare updatedAt: NonAttribute<Date>;
    declare token: string | null;
    declare tokenExpiresDate: Date | null;
}

async function initUserModel(sequelize: Sequelize): Promise<void> {
    User.init(
        {
            userId: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: UUIDV4,
                validate:{
                    isUUID: 4
                }
            },
            username: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false,
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            role: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            token: {
                type: DataTypes.STRING,
                unique: true,
            },
            tokenExpiresDate: {
                type: DataTypes.DATE,
            }
        },
        {
            sequelize: sequelize,
            tableName: "User",
            timestamps: true,
        }
    )
}

async function initUserAssociations(): Promise<void> {
    ;
}