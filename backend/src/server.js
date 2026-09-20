const http = require("node:http");

require("dotenv").config();

const { PORT } = require("./config/env");
const { connectDatabase, disconnectDatabase } = require("./config/db");
const logger = require("./config/logger");
const app = require("./app");

const SHUTDOWN_TIMEOUT_MS = 10000;

let server;

async function startServer() {
   try {
      await connectDatabase();
      logger.info("Database connected");

      server = http.createServer(app);

      server.listen(PORT, () => {
         logger.info(`Server running on http://localhost:${PORT}`);
      });
   } catch (error) {
      logger.error({ err: error }, "Failed to start server");
      process.exit(1);
   }
}

async function shutdown(signal) {
   logger.info(`${signal} received, shutting down`);

   const forceExit = setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
   }, SHUTDOWN_TIMEOUT_MS);
   forceExit.unref();

   try {
      if (server) {
         await new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
         });
      }
      await disconnectDatabase();

      clearTimeout(forceExit);

      logger.info("Cleanup complete, exiting");
      process.exit(0);
   } catch (error) {
      logger.error({ err: error }, "Error during shutdown");
      process.exit(1);
   }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer();
