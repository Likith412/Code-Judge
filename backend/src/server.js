const http = require("node:http");

require("dotenv").config();

const { PORT } = require("./config/env");
const { connectDatabase, disconnectDatabase } = require("./config/db");
const { connectRedis, disconnectRedis } = require("./config/redis");
const { verifyMailer } = require("./config/mailer");
const logger = require("./config/logger");
const { queue } = require("./queue");
const { attachSockets, closeSockets } = require("./sockets");
const app = require("./app");

const SHUTDOWN_TIMEOUT_MS = 10000;

let server;

async function startServer() {
   try {
      await connectDatabase();
      logger.info("Database connected");

      await connectRedis();
      logger.info("Redis connected");

      // Warn about broken mail now, not on the first registration.
      await verifyMailer();

      server = http.createServer(app);

      await attachSockets(server);

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
      // Open sockets would keep server.close() waiting, so this closes both.
      if (server) await closeSockets();

      await queue.close();
      await disconnectRedis();
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
