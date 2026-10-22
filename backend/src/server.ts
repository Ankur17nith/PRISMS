import "dotenv/config";
import app from "./app.js";
const port = Number(process.env.PORT ?? 4000);

const server = app.listen(port, () => {
  console.log(`PRISMS API listening on port ${port}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down...`);

  server.close((error) => {
    if (error) {
      console.error("Error while closing the server:", error);
      process.exitCode = 1;
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));