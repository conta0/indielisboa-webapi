import { app } from "./app";
import * as config from "./config.json";

const PORT: number = Number(process.env.PORT) || config.app.port;

// Start server
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
