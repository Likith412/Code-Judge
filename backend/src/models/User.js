const { Schema, model } = require("mongoose");

const statsSchema = new Schema(
   {
      solvedTotal: { type: Number, default: 0, min: 0 },
      solvedEasy: { type: Number, default: 0, min: 0 },
      solvedMedium: { type: Number, default: 0, min: 0 },
      solvedHard: { type: Number, default: 0, min: 0 },
      totalSubmissions: { type: Number, default: 0, min: 0 },
      acceptedSubmissions: { type: Number, default: 0, min: 0 },
      languageCounts: { type: Map, of: Number, default: () => ({}) },
   },
   { _id: false },
);

// The main user table. One row per account, never deleted.
const userSchema = new Schema(
   {
      username: {
         type: String,
         required: true,
         unique: true,
         lowercase: true,
         trim: true,
         minlength: 3,
         maxlength: 20,
         match: /^[a-z0-9_]+$/,
      },
      displayName: { type: String, trim: true, maxlength: 50 },
      email: {
         type: String,
         required: true,
         unique: true,
         lowercase: true,
         trim: true,
      },
      emailVerified: { type: Boolean, required: true, default: false },

      passwordHash: { type: String, required: true, select: false },
      passwordUpdatedAt: Date,

      role: {
         type: String,
         enum: ["USER", "SETTER", "ADMIN"],
         required: true,
         default: "USER",
      },
      status: {
         type: String,
         enum: ["ACTIVE", "BANNED", "DELETED"],
         required: true,
         default: "ACTIVE",
      },

      // Raised by one to kill every access token already handed out.
      tokenVersion: { type: Number, required: true, default: 0, min: 0 },

      avatarUrl: String,
      bio: { type: String, maxlength: 300 },

      stats: { type: statsSchema, required: true, default: () => ({}) },
      solvedProblemIds: [{ type: Schema.Types.ObjectId, ref: "Problem" }],

      lastLoginAt: Date,
   },
   { timestamps: true },
);

userSchema.index({ status: 1 });
userSchema.index({ "stats.solvedTotal": -1 });

module.exports = model("User", userSchema);
