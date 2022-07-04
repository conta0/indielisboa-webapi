import { app } from "./app";
import * as config from "./config.json";
import { initDatabase } from "./sequelize"

// Workaround solution to enable the use of async/await.
// async/await can't be used at top-level without changing the configuration file
// which breaks the code in other places.
(async () => {
    const PORT: number = Number(process.env.PORT) || config.app.port;

    // Start database
    await initDatabase();
    
    // Start server
    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}.`);
    });
})();

export async function delay(mills: number) {
    return new Promise<void>((resolve, reject) => {
        console.log(`delay for ${mills} millis`);
        setTimeout(() => {console.log("delay done"); resolve()}, mills);
    })
}