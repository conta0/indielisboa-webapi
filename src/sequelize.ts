import { Sequelize } from "sequelize";
import { sequelize as options } from "./config.json";

/**
 * Initializes the Model's associations.
 */
type AssociationsInit = () => Promise<void>

/**
 * Receives a Sequelize instance to initialize the Model.
 * @param seq The Sequelize instance.
 * @returns A promise to be either resolved after the Model is initialized or rejected with an Error.
 */
 type ModelInit = (seq: Sequelize) => Promise<void>;
 const models: ModelInit[] = [];
 const associations: AssociationsInit[] = [];

/**
 * Models defined elsewhere call this method to sync with the database during initialization. 
 * 
 * @param init Function that takes a sequelize instance and initializes the Model.
 */
export function registerModel(init: ModelInit) {
    models.push(init);
}

/**
 * Model associations defined elsewhere call this method to sync with the database during initialization.
 * 
 * @param init Function that initializes the Model's associations.
 */
export function registerAssociations(init: AssociationsInit) {
    associations.push(init);
}

/**
 * Initializes the DB connection.
 */
export async function initDatabase(): Promise<void> {
    console.log("Initializing DB connection...");
    const sequelize = await getSequelizeInstace();
    
    try {
        await sequelize.authenticate();
    } catch (error) {
        return Promise.reject("Connection failed. Verify connection info ('DATABASE_URL' or 'config.json').");
    }
    
    console.log("Authenticated.");

    await Promise.all(models.map(func => func(sequelize)));
    await Promise.all(associations.map(func => func()));
    await sequelize.sync();
}

async function getSequelizeInstace(): Promise<Sequelize> {
    const URL = process.env.DATABASE_URL;
    
    if (URL != null) {
        console.log("Using environment variable 'DATABASE_URL'.");
        return new Sequelize(URL, {dialectOptions: options.dialectOptions});
    }

    if (options.dialect) {
        console.log("Using config.json file values.");
        return new Sequelize(options as any);
    }

    return Promise.reject(
        "No connection configuration. "+
        "Set the 'DATABASE_URL' enviroment variable or use the 'config.json' file."
    )
}