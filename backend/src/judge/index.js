// Judges one submission. Only the worker runs this, never the API.
const logger = require("../config/logger");
const { Problem, Submission, TestCase } = require("../models");
const { addJudgeJob, publishStatus } = require("../queue");
const { PENDING_STATUSES } = require("../utils/constants");
const runner = require("./dockerRunner");
const { runCases } = require("./runCases");
const { saveVerdict } = require("./saveVerdict");

/* ---- one job, start to end -------------------------------------------- */

// Loads the problem and cases, then runs them. Throws if it cannot judge.
async function judgeCases(submission) {
   const problem = await Problem.findById(submission.problemId).select(
      "timeLimitMs memoryLimitMb comparisonMode",
   );
   const filter = { problemId: submission.problemId };

   if (submission.isSampleRun) filter.isHidden = false;

   const cases = await TestCase.find(filter).sort({ order: 1 });

   if (!problem || !cases.length) throw new Error("Nothing to judge against");

   return {
      ...(await runCases(submission, problem, cases)),
      totalTestCases: cases.length,
   };
}

// The worker runs this once per job. Returns the status, for the log.
async function judgeJob(job) {
   const id = job.data.submissionId;
   const attempt = job.attemptsMade + 1;

   // Skip rows with a verdict. A RUNNING row was left by a dead worker.
   const submission = await Submission.findOneAndUpdate(
      { _id: id, status: { $in: PENDING_STATUSES } },
      { $set: { status: "RUNNING", jobId: job.id } },
      { returnDocument: "after" },
   );

   if (!submission) return "SKIPPED";

   await publishStatus(submission, "RUNNING");

   const triesLeft = attempt < (job.opts.attempts ?? 1);

   // Back in line for a retry, only if no other run has finished it.
   const retry = async (err) => {
      const reset = await Submission.updateOne(
         { _id: id, status: "RUNNING" },
         { $set: { status: "QUEUED" } },
      );

      if (!reset.modifiedCount) return "SKIPPED";

      await publishStatus(submission, "QUEUED");
      throw err;
   };

   let fields;

   try {
      fields = await judgeCases(submission);
   } catch (err) {
      // Not the user's fault, so no message of ours reaches them.
      logger.error({ err, submissionId: id, attempt }, "judging failed");

      if (triesLeft) return retry(err);

      fields = { status: "SYSTEM_ERROR" };
   }

   try {
      await saveVerdict(submission, fields);
   } catch (err) {
      logger.error({ err, submissionId: id, attempt }, "could not save verdict");

      if (triesLeft) return retry(err);

      // Last try: end the row, so it stops counting as waiting.
      fields = { status: "SYSTEM_ERROR" };
      await Submission.updateOne(
         { _id: id, status: "RUNNING" },
         { $set: { status: "SYSTEM_ERROR", judgedAt: new Date() } },
      ).catch((endErr) =>
         logger.error({ err: endErr, submissionId: id }, "row left RUNNING"),
      );
   }

   await publishStatus(submission, fields.status);

   return fields.status;
}

/* ---- worker startup --------------------------------------------------- */

// No Docker or images means nothing can be judged, so stop here.
async function checkSandbox() {
   // Their jobs run again, so old boxes are of no use.
   const removed = await runner.removeLeftovers();
   if (removed) logger.info(`Removed ${removed} leftover sandboxes`);

   const missing = await runner.missingImages();
   if (missing.length) {
      throw new Error(
         `Judge images missing: ${missing.join(", ")}. Run npm run judge:images`,
      );
   }
}

// Re-adds every unfinished row, in case Redis lost its job. Live jobs stay as is.
async function requeuePending() {
   const rows = await Submission.find({ status: { $in: PENDING_STATUSES } })
      .sort({ createdAt: 1 })
      .select("_id");

   for (const row of rows) await addJudgeJob(row._id);

   return rows.length;
}

module.exports = { judgeJob, checkSandbox, requeuePending };
