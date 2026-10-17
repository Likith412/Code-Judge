// Writes the verdict and every counter it moves, all at once or not at all.
const { Problem, Submission, User } = require("../models");
const { runTransaction } = require("../utils/transaction");

// Run is not history, and a system error is not the user's fault.
const counts = (submission, status) =>
   !submission.isSampleRun && status !== "SYSTEM_ERROR";

const SOLVED_FIELD = {
   EASY: "stats.solvedEasy",
   MEDIUM: "stats.solvedMedium",
   HARD: "stats.solvedHard",
};

async function countVerdict(submission, status, session) {
   const { userId, problemId, language } = submission;
   const accepted = status === "ACCEPTED" ? 1 : 0;

   await User.updateOne(
      { _id: userId },
      {
         $inc: {
            "stats.totalSubmissions": 1,
            "stats.acceptedSubmissions": accepted,
            [`stats.languageCounts.${language}`]: 1,
         },
      },
      { session },
   );

   await Problem.updateOne(
      { _id: problemId },
      {
         $inc: {
            "stats.totalSubmissions": 1,
            "stats.acceptedSubmissions": accepted,
         },
      },
      { session },
   );

   if (!accepted) return;

   const problem = await Problem.findById(problemId)
      .select("difficulty")
      .session(session);

   // Deleted while it was being judged. Nothing left to mark as solved.
   if (!problem) return;

   // Matches nothing once the problem is in the list, so a second solve adds nothing.
   const firstSolve = await User.updateOne(
      { _id: userId, solvedProblemIds: { $ne: problemId } },
      {
         $push: { solvedProblemIds: problemId },
         $inc: { "stats.solvedTotal": 1, [SOLVED_FIELD[problem.difficulty]]: 1 },
      },
      { session },
   );

   if (firstSolve.modifiedCount) {
      await Problem.updateOne(
         { _id: problemId },
         { $inc: { "stats.solvedByCount": 1 } },
         { session },
      );
   }
}

// Only a RUNNING row is written, so a job that runs twice counts once.
async function saveVerdict(submission, fields) {
   await runTransaction(async (session) => {
      const saved = await Submission.updateOne(
         { _id: submission._id, status: "RUNNING" },
         { $set: { ...fields, judgedAt: new Date() } },
         { session },
      );

      if (saved.modifiedCount && counts(submission, fields.status)) {
         await countVerdict(submission, fields.status, session);
      }
   });
}

module.exports = { saveVerdict };
