import express, {Express, Request, Response} from "express";
import cookieParser from "cookie-parser";

import {initRouter} from "./router";

// ------------------------------ Placeholder Database ------------------------------ //
const locationRepository = [
    {address: "location-1"},
    {address: "location-2"},
    {address: "location-3"},
];

const database: any = {
    findLocations() {
        return locationRepository;
    },
    addLocation(address: string) {
        const newLocation = {address: address};
        locationRepository.push(newLocation);
        return newLocation;
    },
    findSales() {
        return [];
    }
};
// ------------------------------ Placeholder Database ------------------------------ //

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 8080;
const ROUTER = initRouter(database);

// JSON middleware
app.use(express.json());
// Cookie parser middleware
app.use(cookieParser());

// Routes
app.use("/api/v1", ROUTER);

// Start server
app.listen(PORT);