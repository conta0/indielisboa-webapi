import express, { Express, Request, Response, Router } from "express";
import swaggerUI from "swagger-ui-express";
import cookieParser from "cookie-parser";

export const app: Express = express();

// OpenAPI specification
import API_SPECIFICATION from "./swagger.json";
const API_PATH = "/api/v1";
API_SPECIFICATION.servers[0].url = API_PATH;

// JSON middleware
app.use(express.json());

// Cookie parser middleware
app.use(cookieParser());

// Documentation routes
app.get("/api-docs/openapi.json", (request: Request, response: Response) => {
    response.status(200);
    response.json(API_SPECIFICATION);
    response.end();
});
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(API_SPECIFICATION));

// API Routes
import { RegisterRoutes } from "./routes";
import { requestErrorHandler } from "./common/errors";
const ROUTER = express.Router();
RegisterRoutes(ROUTER);
app.use(API_PATH, ROUTER);

// Default Error Handler
app.use(requestErrorHandler);