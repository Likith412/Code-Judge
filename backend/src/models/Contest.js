const { Schema, model } = require("mongoose");

const contestSchema = new Schema(
   {
      title: { type: String, required: true, trim: true },
      slug: { type: String, required: true, unique: true },
      description: { type: String, default: "" },
      startTime: { type: Date, required: true },
      endTime: { type: Date, required: true },
      problems: [
         {
            _id: false,
            problemId: {
               type: Schema.Types.ObjectId,
               ref: "Problem",
               required: true,
            },
            label: { type: String, required: true },
            points: { type: Number, required: true, min: 1 },
         },
      ],
      penaltyPerWrongMin: { type: Number, default: 10, min: 0 },
      isPublished: { type: Boolean, default: false },
      participantCount: { type: Number, default: 0 },
      createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
   },
   { timestamps: true },
);

// A question belongs to one contest, so another contest cannot expose it early.
contestSchema.index(
   { "problems.problemId": 1 },
   { unique: true, sparse: true },
);
contestSchema.index({ isPublished: 1, startTime: -1 });

module.exports = model("Contest", contestSchema);
