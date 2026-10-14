// One handler per /api/submissions route. What they share is in ./helpers.
const logger = require("../../config/logger");
const { Submission } = require("../../models");
const { addJudgeJob } = require("../../queue");
const { ApiError } = require("../../utils/ApiError");

const {
   loadSolvableProblem,
   checkWaiting,
   countCases,
   loadVisibleSubmission,
   submissionView,
} = require("./helpers");

// Saved as QUEUED and answered at once. The worker judges it.
async function createSubmission(req, res) {
   const body = req.valid.body;
   const problem = await loadSolvableProblem(body.problemId, body.language);

   await checkWaiting(req.user._id);

   const submission = await Submission.create({
      userId: req.user._id,
      problemId: problem._id,
      language: body.language,
      sourceCode: body.sourceCode,
      isSampleRun: body.isSampleRun,
      totalTestCases: await countCases(problem._id, body.isSampleRun),
   });

   // Could not queue it, so drop the row instead of leaving it waiting.
   try {
      await addJudgeJob(submission._id);
   } catch (err) {
      logger.error({ err, submissionId: submission._id }, "could not queue");
      await Submission.deleteOne({ _id: submission._id });
      throw ApiError.unavailable("The judge is down. Try again in a minute.");
   }

   res.status(202).json({ submission: submissionView(submission) });
}

async function getSubmission(req, res) {
   const submission = await loadVisibleSubmission(
      req.valid.params.id,
      req.user,
   );

   res.json({ submission: submissionView(submission) });
}

module.exports = { createSubmission, getSubmission };
