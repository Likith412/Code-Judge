const { Schema, model } = require("mongoose");

const {
   LANGUAGES,
   DIFFICULTIES,
   COMPARISON_MODES,
} = require("../utils/constants");

// Sorting on the word would put HARD between EASY and MEDIUM.
const DIFFICULTY_RANK = { EASY: 1, MEDIUM: 2, HARD: 3 };

// Shown on the problem page. The judge never reads these.
const exampleSchema = new Schema(
   {
      input: { type: String, required: true },
      output: { type: String, required: true },
      explanation: String,
   },
   { _id: false },
);

// The code the editor opens with, one entry per language.
const starterCodeSchema = new Schema(
   { java: String, python: String, cpp: String },
   { _id: false },
);

const statsSchema = new Schema(
   {
      totalSubmissions: { type: Number, default: 0, min: 0 },
      acceptedSubmissions: { type: Number, default: 0, min: 0 },
      solvedByCount: { type: Number, default: 0, min: 0 },
   },
   { _id: false },
);

// One row per question. Test cases sit in their own collection.
const problemSchema = new Schema(
   {
      title: { type: String, required: true, trim: true, maxlength: 120 },
      slug: {
         type: String,
         required: true,
         unique: true,
         lowercase: true,
         trim: true,
      },
      description: { type: String, required: true },

      difficulty: { type: String, enum: DIFFICULTIES, required: true },

      // Kept in step with difficulty by the hook below, only used to sort.
      difficultyRank: { type: Number, required: true, default: 1 },
      constraints: [{ type: String, trim: true }],
      examples: [exampleSchema],

      starterCode: { type: starterCodeSchema, default: () => ({}) },
      supportedLanguages: {
         type: [{ type: String, enum: LANGUAGES }],
         // "required" alone would let an empty list through.
         validate: {
            validator: (list) => list.length > 0,
            message: "Pick at least one language",
         },
      },
      tags: [{ type: String, lowercase: true, trim: true }],

      timeLimitMs: { type: Number, required: true, default: 2000 },
      memoryLimitMb: { type: Number, required: true, default: 256 },
      comparisonMode: {
         type: String,
         enum: COMPARISON_MODES,
         required: true,
         default: "TRIM",
      },

      // Copy of the test case count, so the list page needs no join.
      testCaseCount: { type: Number, required: true, default: 0, min: 0 },
      isPublished: { type: Boolean, required: true, default: false },

      createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      stats: { type: statsSchema, required: true, default: () => ({}) },
   },
   { timestamps: true },
);

// Set the rank here so every writer gets it, the seed script included.
problemSchema.pre("validate", function copyDifficultyRank() {
   this.difficultyRank = DIFFICULTY_RANK[this.difficulty] || 1;
});

problemSchema.index({ isPublished: 1, difficulty: 1 });
problemSchema.index({ isPublished: 1, difficultyRank: 1 });
problemSchema.index({ tags: 1 });
problemSchema.index({ title: "text", description: "text" });

module.exports = model("Problem", problemSchema);
