import { app } from "./app";
import * as config from "./config.json";
import { Role } from "./security/authorization";
import { initDatabase } from "./sequelize"
import { User } from "./users/usersService";

import path from "path";
import fs from "fs";
import http from "http";
import https from "https";

const PORT: number = Number(process.env.PORT) || config.server.port;
const USE_HTTPS: boolean = config.server.https;
const CERT_PATH: string = path.join(__dirname, ".", "sslcerts", "cert.pem");
const KEY_PATH: string = path.join(__dirname, ".", "sslcerts", "key.pem");
const PASSPHRASE: string = process.env.PASSPHRASE || config.server.passphrase;

// Workaround solution to enable the use of async/await.
// async/await can't be used at top-level without changing the configuration file
// which breaks the code in other places.
(async () => {
    // Start database
    await initDatabase();
    console.log("Connected successfully to DB!");

    // Initial configuration admin configuration
    const user = await User.findOne({where: {role: Role.ADMIN}});
    if (user == null) {
        console.log("No admin account detected.");
        const username: string = process.env.ADMIN_USER || config.security.adminUsername;
        const password: string = process.env.ADMIN_PW || config.security.adminPassword;

        if (username == null || password == null) {
            console.log("No admin configuration. Restart with valid configuration or create one directly.");
            console.log("Some resources will be unavailable without an admin account.");
        } else {
            await User.create({username, password, name: "ADMIN", role: Role.ADMIN});
            console.log("Created default admin account.");
        }
    }
    // Start server
    if (USE_HTTPS) {
        const certificate = fs.readFileSync(CERT_PATH, "utf-8");
        const privateKey = fs.readFileSync(KEY_PATH, "utf-8");
        https.createServer(
            {
                cert: certificate,
                key: privateKey,
                passphrase: PASSPHRASE
            }
            , app).listen(PORT, () => { console.log(`HTTPS Server started on port ${PORT}`); })
    } else {
        http.createServer(app).listen(PORT, () => { console.log(`HTTP Server started on port ${PORT}.`); });
    }
})().catch(console.log);

export async function delay(mills: number) {
    return new Promise<void>((resolve, reject) => {
        console.log(`delay for ${mills} millis`);
        setTimeout(() => {console.log("delay done"); resolve()}, mills);
    })
}