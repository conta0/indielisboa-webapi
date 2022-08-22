import express, { Express, Request, Response } from "express";
import swaggerUI from "swagger-ui-express";
import cookieParser from "cookie-parser";
import { server as config } from "./config.json";

// Single express instace
export const app: Express = express();

// OpenAPI specification
import API_SPECIFICATION from "./swagger.json";
const API_PATH = "/v1";
API_SPECIFICATION.servers[0].url = API_PATH;

// JSON middleware
app.use(express.json());

// Cookie parser middleware
app.use(cookieParser());

// Redirect HTTP requests.
// If behind a trusted proxy, the request headers "x-forwarded" will be trusted.
const TRUST_PROXY: boolean = config.trustProxy;
if (TRUST_PROXY) {
    app.enable("trust proxy");
    app.use("*", (request: Request, response: Response, next: Function) => {
        if (request.headers["x-forwarded-proto"] === "http") {
            response.redirect(`https://${request.get("host")}${request.originalUrl}`);
        } else {
            next();
        }
    });
}

// Documentation routes
app.get("/docs/swagger.json", (request: Request, response: Response) => {
    response.status(200);
    response.json(API_SPECIFICATION);
    response.end();
});
app.use("/docs", swaggerUI.serve, swaggerUI.setup(API_SPECIFICATION));

// API Routes
import { RegisterRoutes } from "./routes";
import { requestErrorHandler } from "./common/errors";

const ROUTER = express.Router();
RegisterRoutes(ROUTER);
app.use(API_PATH, ROUTER);

// Default Error Handler
app.use(requestErrorHandler);