const { Schema, model } = require("mongoose");

// One row per case, kept apart so a hidden one cannot leak through a problem.
const testCaseSchema = new Schema(
   {
      problemId: {
         type: Schema.Types.ObjectId,
         ref: "Problem",
         required: true,
      },

      // Run order, starts at 1. Gaps after a delete are fine.
      order: { type: Number, required: true, min: 1 },

      // Empty input is fine, empty expected output is nearly always a mistake.
      input: { type: String, default: "" },
      expectedOutput: { type: String, required: true },

      // Hidden by default: a case you forget to mark stays private.
      isHidden: { type: Boolean, required: true, default: true },

      // Only sample cases show one.
      explanation: String,

      // For partial scoring later. Every case counts the same for now.
      weight: { type: Number, required: true, default: 1, min: 0 },
   },
   { timestamps: true },
);

// Unique, so two adds at the same moment cannot both take the same number.
testCaseSchema.index({ problemId: 1, order: 1 }, { unique: true });
testCaseSchema.index({ problemId: 1, isHidden: 1 });

module.exports = model("TestCase", testCaseSchema);
