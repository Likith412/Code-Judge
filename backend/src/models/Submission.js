const { Schema, model } = require("mongoose");

const { LANGUAGES, SUBMISSION_STATUSES } = require("../utils/constants");

// Sample runs are thrown away after a day.
const SAMPLE_RUN_TTL_SECONDS = 24 * 60 * 60;

// One sample case as it ran. Samples are public, so their text can be kept.
const sampleResultSchema = new Schema(
   {
      position: { type: Number, required: true },
      status: { type: String, enum: SUBMISSION_STATUSES, required: true },
      input: { type: String, default: "" },
      expectedOutput: { type: String, default: "" },
      actualOutput: { type: String, default: "" },
      runtimeMs: Number,
   },
   { _id: false },
);

// One row per Run or Submit press.
const submissionSchema = new Schema(
   {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      problemId: {
         type: Schema.Types.ObjectId,
         ref: "Problem",
         required: true,
      },
      contestId: { type: Schema.Types.ObjectId, ref: "Contest" },

      language: { type: String, enum: LANGUAGES, required: true },
      sourceCode: { type: String, required: true },

      status: {
         type: String,
         enum: SUBMISSION_STATUSES,
         required: true,
         default: "QUEUED",
      },

      // Worst over the cases that ran. Unset until there is a verdict.
      runtimeMs: Number,
      memoryKb: Number,

      testCasesPassed: { type: Number, required: true, default: 0 },
      totalTestCases: { type: Number, required: true, default: 0 },

      // Position in the run, from 1. Not the case's order, which can have gaps.
      failedTestIndex: Number,
      errorMessage: String,

      // Run: every sample. Submit: only the failed case, and only if it is a sample.
      sampleResults: { type: [sampleResultSchema], default: undefined },

      isSampleRun: { type: Boolean, required: true, default: false },

      jobId: String,
      judgedAt: Date,
      workerId: String,
   },
   { timestamps: true },
);

submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ problemId: 1, createdAt: -1 });
submissionSchema.index({ userId: 1, problemId: 1, status: 1 });
submissionSchema.index({ status: 1, createdAt: 1 });
submissionSchema.index(
   { contestId: 1, userId: 1, createdAt: 1 },
   { partialFilterExpression: { contestId: { $exists: true } } },
);
submissionSchema.index(
   { createdAt: 1 },
   {
      name: "sample_run_ttl",
      expireAfterSeconds: SAMPLE_RUN_TTL_SECONDS,
      partialFilterExpression: { isSampleRun: true },
   },
);

module.exports = model("Submission", submissionSchema);
