import { app } from "./app";
import * as config from "./config.json";
import { Role } from "./security/authorization";
import { initDatabase } from "./sequelize"
import { User } from "./users/usersService";

// Workaround solution to enable the use of async/await.
// async/await can't be used at top-level without changing the configuration file
// which breaks the code in other places.
(async () => {
    const PORT: number = Number(process.env.PORT) || config.app.port;

    // Start database
    await initDatabase();
    console.log("Connected successfully!");

    // Initial configuration admin configuration
    const user = await User.findOne({where: {role: Role.ADMIN}});
    if (user == null) {
        console.log("No admin account detected.");
        const username = process.env.ADMIN_USER || config.security.adminUsername;
        const password = process.env.ADMIN_PW || config.security.adminPassword;

        if (username == null || password == null) {
            console.log("No admin configuration. Restart with valid configuration or create one directly.");
            console.log("Some resources will be unavailable without an admin account.");
        } else {
            await User.create({username, password, name: "ADMIN", role: Role.ADMIN});
            console.log("Created default admin account.");
        }
    }

    // Start server
    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}.`);
    });
})().catch(console.log);

export async function delay(mills: number) {
    return new Promise<void>((resolve, reject) => {
        console.log(`delay for ${mills} millis`);
        setTimeout(() => {console.log("delay done"); resolve()}, mills);
    })
}