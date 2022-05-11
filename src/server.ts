import { app } from "./app";

const PORT: number = Number(process.env.PORT) || 8080;

// Start server
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
