// Judges submissions inside the API process. Phase 6 moves this to the worker.
const os = require("node:os");

const logger = require("../config/logger");
const { Problem, Submission, TestCase } = require("../models");
const { PENDING_STATUSES } = require("../utils/constants");
const { outputMatches } = require("./compare");
const runner = require("./localRunner");

// More at once would starve the API of CPU. BullMQ takes over in phase 6.
const MAX_RUNNING = 2;

// Long enough for a stack trace, short enough for a document.
const MESSAGE_LIMIT = 8 * 1024;
const SAMPLE_OUTPUT_LIMIT = 4 * 1024;

const WORKER_ID = `api-${os.hostname()}-${process.pid}`;

const cut = (text, limit) =>
   text.length > limit
      ? `${text.slice(0, limit)}\n… cut at ${limit} characters`
      : text;

/* ---- one case, raw result to verdict ---------------------------------- */

function caseVerdict(raw, testCase, comparisonMode) {
   if (raw.timedOut) return { status: "TIME_LIMIT_EXCEEDED" };
   if (raw.outOfMemory) return { status: "MEMORY_LIMIT_EXCEEDED" };

   if (raw.overflow) {
      return {
         status: "RUNTIME_ERROR",
         message: `Printed more than ${runner.OUTPUT_LIMIT_BYTES / 1024} KB, so it was stopped.`,
      };
   }

   if (raw.code !== 0) {
      return {
         status: "RUNTIME_ERROR",
         message: raw.stderr || `Exited with code ${raw.code}`,
      };
   }

   const passed = outputMatches(
      raw.stdout,
      testCase.expectedOutput,
      comparisonMode,
   );

   return { status: passed ? "ACCEPTED" : "WRONG_ANSWER" };
}

// A sample is public, so what it was fed and what came out can be shown.
const sampleResult = (position, testCase, raw, verdict) => ({
   position,
   status: verdict.status,
   input: testCase.input,
   expectedOutput: testCase.expectedOutput,
   actualOutput: cut(raw.stdout, SAMPLE_OUTPUT_LIMIT),
   runtimeMs: raw.ms,
});

/* ---- every case, to the fields a submission keeps --------------------- */

// Submit stops at the first failure. Run goes through every sample.
async function runCases(submission, problem, cases) {
   const limits = {
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
   };
   const stopEarly = !submission.isSampleRun;

   const { dir, compileError } = await runner.prepare(
      submission.language,
      submission.sourceCode,
   );

   try {
      if (compileError) {
         return {
            status: "COMPILATION_ERROR",
            testCasesPassed: 0,
            errorMessage: cut(compileError, MESSAGE_LIMIT),
         };
      }

      const fields = { status: "ACCEPTED", testCasesPassed: 0, runtimeMs: 0 };
      const samples = [];

      for (const [index, testCase] of cases.entries()) {
         const position = index + 1;
         const raw = await runner.runOne(
            dir,
            submission.language,
            testCase.input,
            limits,
         );
         const verdict = caseVerdict(raw, testCase, problem.comparisonMode);

         fields.runtimeMs = Math.max(fields.runtimeMs, raw.ms);

         if (submission.isSampleRun) {
            samples.push(sampleResult(position, testCase, raw, verdict));
         }

         if (verdict.status === "ACCEPTED") {
            fields.testCasesPassed += 1;
            continue;
         }

         // The first failure decides the verdict, later ones only add rows.
         if (fields.status === "ACCEPTED") {
            fields.status = verdict.status;
            fields.failedTestIndex = position;
            if (verdict.message)
               fields.errorMessage = cut(verdict.message, MESSAGE_LIMIT);

            if (stopEarly && !testCase.isHidden) {
               samples.push(sampleResult(position, testCase, raw, verdict));
            }
         }

         if (stopEarly) break;
      }

      if (samples.length) fields.sampleResults = samples;

      return fields;
   } finally {
      await runner.cleanup(dir);
   }
}

/* ---- one submission, start to end ------------------------------------- */

async function judgeSubmission(id) {
   // Claim it, so a second call for the same id finds nothing to do.
   const submission = await Submission.findOneAndUpdate(
      { _id: id, status: "QUEUED" },
      { $set: { status: "RUNNING", workerId: WORKER_ID } },
      { returnDocument: "after" },
   );

   if (!submission) return;

   let fields;

   try {
      const problem = await Problem.findById(submission.problemId).select(
         "timeLimitMs memoryLimitMb comparisonMode",
      );
      const filter = { problemId: submission.problemId };

      if (submission.isSampleRun) filter.isHidden = false;

      const cases = await TestCase.find(filter).sort({ order: 1 });

      if (!problem || !cases.length)
         throw new Error("Nothing to judge against");

      fields = {
         ...(await runCases(submission, problem, cases)),
         totalTestCases: cases.length,
      };
   } catch (err) {
      // Not the user's fault, so no message of ours reaches them.
      logger.error({ err, submissionId: id }, "judging failed");
      fields = { status: "SYSTEM_ERROR" };
   }

   await Submission.updateOne(
      { _id: id },
      { $set: { ...fields, judgedAt: new Date() } },
   );
}

/* ---- a tiny in-memory queue ------------------------------------------- */

const waiting = [];
let running = 0;

function drain() {
   while (running < MAX_RUNNING && waiting.length) {
      const id = waiting.shift();

      running += 1;
      judgeSubmission(id)
         .catch((err) =>
            logger.error({ err, submissionId: id }, "judge crashed"),
         )
         .finally(() => {
            running -= 1;
            drain();
         });
   }
}

function enqueue(id) {
   waiting.push(String(id));
   drain();
}

// The queue lives in memory, so a restart loses it. Pick up what was left.
async function resumeJudging() {
   const stuck = await Submission.find({ status: { $in: PENDING_STATUSES } })
      .sort({ createdAt: 1 })
      .select("_id");

   if (!stuck.length) return 0;

   await Submission.updateMany(
      { _id: { $in: stuck.map((row) => row._id) } },
      { $set: { status: "QUEUED" } },
   );

   stuck.forEach((row) => enqueue(row._id));

   return stuck.length;
}

module.exports = { enqueue, resumeJudging, canRun: runner.canRun };
