// The submissions queue, and the channel that says when a status changes.
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

// Tells the API, which tells the browser. Missing one is fine: the page polls too.
async function publishStatus(submission, status) {
   const message = {
      id: String(submission._id),
      userId: String(submission.userId),
      status,
   };

   try {
      await redis.publish(STATUS_CHANNEL, JSON.stringify(message));
   } catch (err) {
      logger.warn({ err: err.message, ...message }, "could not publish status");
   }
}

module.exports = {
   QUEUE_NAME,
   STATUS_CHANNEL,
   queue,
   addJudgeJob,
   publishStatus,
};
