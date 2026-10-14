// The judge worker. Takes submissions off the queue and runs them in Docker.
require("dotenv").config();

const { Worker } = require("bullmq");

const { REDIS_URL } = require("./config/env");
const { connectDatabase, disconnectDatabase } = require("./config/db");
const { connectRedis, disconnectRedis } = require("./config/redis");
const logger = require("./config/logger");
const { QUEUE_NAME, queue } = require("./queue");
const { judgeJob, checkSandbox, requeuePending } = require("./judge");

// Boxes at once. More would slow every run.
const CONCURRENCY = 2;

// Time given to running jobs to finish.
const SHUTDOWN_TIMEOUT_MS = 60_000;

let worker;

async function startWorker() {
   try {
      await connectDatabase();
      logger.info("Database connected");

      await connectRedis();
      logger.info("Redis connected");

      await checkSandbox();

      const pending = await requeuePending();
      if (pending) logger.info(`${pending} unfinished submissions in the queue`);

      // Its own connection, which waits on Redis forever.
      worker = new Worker(QUEUE_NAME, judgeJob, {
         connection: { url: REDIS_URL },
         concurrency: CONCURRENCY,
      });

      worker.on("completed", (job, status) =>
         logger.info({ submissionId: job.data.submissionId, status }, "judged"),
      );
      worker.on("error", (err) => logger.error({ err }, "worker error"));

      logger.info(`Worker judging up to ${CONCURRENCY} at once`);
   } catch (error) {
      logger.error({ err: error }, "Failed to start worker");
      process.exit(1);
   }
}

async function shutdown(signal) {
   logger.info(`${signal} received, shutting down`);

   // A box left behind is removed the next time a worker starts.
   const forceExit = setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
   }, SHUTDOWN_TIMEOUT_MS);
   forceExit.unref();

   try {
      if (worker) await worker.close();
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

startWorker();
