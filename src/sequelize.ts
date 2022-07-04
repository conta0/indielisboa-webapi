import { Sequelize } from "sequelize";
import { sequelize as options } from "./config.json";

type SequelizeObserver = (seq: Sequelize) => Promise<void>;
const observers: SequelizeObserver[] = [];

/**
 * Models defined elsewhere call this method to sync with the database during initialization. 
 * 
 * @param observer Function that takes a sequelize instance and initializes the Model.
 */
export function registerObserver(observer: (seq: Sequelize) => Promise<void>) {
    observers.push(observer);
}

/**
 * Initializes the DB connection.
 */
export async function initDatabase() {
    console.log("Initializing DB connection...");
    const sequelize = await getSequelizeInstace();
    
    await sequelize.authenticate();
    console.log("Authenticated.");

    await Promise.all(observers.map(func => func(sequelize)));
    await sequelize.sync();
    console.log("Connected successfully!");
}

async function getSequelizeInstace(): Promise<Sequelize> {
    const URL = process.env.DATABASE_URL;

    if (URL != null) {
        console.log("Using environment variable 'DATABASE_URL'.");
        return new Sequelize(URL);
    }

    if (options.dialect) {
        console.log("Using config.json file values.");
        return new Sequelize(options as any);
    }

    console.log("Using sqlite in-memory DB");
    return new Sequelize("sqlite::memory:")
}