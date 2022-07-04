import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize, UUIDV4 } from "sequelize";
import { User } from "../common/model";
import { Role } from "../security/authorization";
import bcrypt from "bcrypt";
import { registerObserver } from "../sequelize";
const SALT_ROUNDS = 8;

registerObserver(initUsersService);

export class UserService extends Model<InferAttributes<UserService>, InferCreationAttributes<UserService>> implements User {
    declare userId: CreationOptional<string>;
    declare username: string;
    declare password: string;
    declare name: string;
    declare role: Role;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    static async validatePassword(user: User, password: string): Promise<boolean> {
        return await bcrypt.compare(password, user.password);
    }
}

async function initUsersService(sequelize: Sequelize) {
    UserService.init(
        {
            userId: {
                type: DataTypes.UUIDV4,
                primaryKey: true,
                defaultValue: UUIDV4,
                validate:{
                    isUUID: 4
                }
            },
            username: {
                type: DataTypes.STRING,
                unique: true
            },
            password: {
                type: DataTypes.STRING
            },
            name: {
                type: DataTypes.STRING
            },
            role: {
                type: DataTypes.STRING
            },
            createdAt: {
                type: DataTypes.DATE
            },
            updatedAt: {
                type: DataTypes.DATE
            }
        },
        {
            sequelize: sequelize,
            tableName: "User",
            hooks: {
                beforeCreate: async(user: User) => {
                    user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
                }
            }
        }
    )

    UserService.create({name: "Alice", username: "user000", password: "password", role: Role.ADMIN});
}