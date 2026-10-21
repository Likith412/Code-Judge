const { Schema, model } = require("mongoose");

const participantSchema = new Schema({
   contestId: { type: Schema.Types.ObjectId, ref: "Contest", required: true },
   userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
   score: { type: Number, default: 0 },
   penaltyMinutes: { type: Number, default: 0 },
   solved: [
      {
         _id: false,
         problemId: Schema.Types.ObjectId,
         solvedAtMin: Number,
         wrongAttempts: Number,
         points: Number,
      },
   ],
   joinedAt: { type: Date, default: Date.now },
   // Set when the participant ends the contest early. After it, no more Submits.
   finishedAt: { type: Date, default: null },
});

participantSchema.index({ contestId: 1, userId: 1 }, { unique: true });
participantSchema.index({
   contestId: 1,
   score: -1,
   penaltyMinutes: 1,
   joinedAt: 1,
   _id: 1,
});

module.exports = model("ContestParticipant", participantSchema);
