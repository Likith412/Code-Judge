// The submissions queue, and the channel that says when a status changes.
const { setTimeout: sleep } = require("node:timers/promises");
const { Queue } = require("bullmq");

const logger = require("../config/logger");
const { redis } = require("../config/redis");

const QUEUE_NAME = "submissions";
const JUDGE_JOB = "judge";
const STATUS_CHANNEL = "submission-status";

// One try plus two retries, only on SYSTEM_ERROR.
const JOB_OPTIONS = {
   attempts: 3,
   backoff: { type: "exponential", delay: 2_000 },
   // The verdict is in MongoDB, so finished jobs are dropped.
   removeOnComplete: true,
   removeOnFail: true,
};

const queue = new Queue(QUEUE_NAME, {
   connection: redis,
   defaultJobOptions: JOB_OPTIONS,
});

// Job id = submission id, so adding one twice does nothing.
const addJudgeJob = (submissionId) =>
   queue.add(
      JUDGE_JOB,
      { submissionId: String(submissionId) },
      { jobId: String(submissionId) },
   );

// Waits between tries, about 7 seconds in all.
const PUBLISH_RETRY_MS = [500, 1000, 2000, 4000];

// Tells the API, which tells the browser. Retries ride out a short Redis outage.
async function publishStatus(submission, status) {
   const message = {
      id: String(submission._id),
      userId: String(submission.userId),
      status,
   };

   for (let attempt = 0; ; attempt += 1) {
      try {
         await redis.publish(STATUS_CHANNEL, JSON.stringify(message));

         return;
      } catch (err) {
         if (attempt === PUBLISH_RETRY_MS.length) {
            logger.warn({ err: err.message, ...message }, "could not publish");

            return;
         }

         await sleep(PUBLISH_RETRY_MS[attempt]);
      }
   }
}

module.exports = {
   QUEUE_NAME,
   STATUS_CHANNEL,
   queue,
   addJudgeJob,
   publishStatus,
};
