import express, {Express, Request, response, Response} from "express";
import cookieParser from "cookie-parser";

import {initRouter} from "./router";

// ------------------------------ Placeholder Database ------------------------------ //
const locationRepository = [
    {address: "location-1"},
    {address: "location-2"},
    {address: "location-3"},
];

const userRepository = [
    {
        username: "admin",
        password: "123",
        userId: "admin",
        role: "admin",
    },
    {
        username: "seller",
        password: "123",
        userId: "seller",
        role: "seller",
    },
    {
        username: "guest1",
        password: "123",
        userId: "guest-1",
        role: "none",
    },
    {
        username: "guest2",
        password: "123",
        userId: "guest-2",
        role: "none",
    }
]

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
    },
    createSale(ignore: any) {
        return ignore;
    },
    findUsers() {
        return [
            "user-1",
            "user-2"
        ]
    },
    createUser(ignore: any) {
        return ignore;
    },
    updateUser(userId: string, details: any) {
        console.log(userId, details);
    },
    getUserWithCredentials(username: string, password: string) {
        for (let user of userRepository) {
            if (user.username === username && user.password === password) {
                return user;
            }
        }
        
        return null;
    }
};

// -------------------------------------------------------------------------------- //
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