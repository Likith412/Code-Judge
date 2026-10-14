// The submissions queue. The API adds jobs, the worker takes them.
const { Queue } = require("bullmq");

const { redis } = require("../config/redis");

const QUEUE_NAME = "submissions";
const JUDGE_JOB = "judge";

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

module.exports = { QUEUE_NAME, queue, addJudgeJob };
