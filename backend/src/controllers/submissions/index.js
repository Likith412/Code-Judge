// One handler per /api/submissions route. What they share is in ./helpers.
const { Submission } = require("../../models");
const { enqueue } = require("../../judge");

const {
   loadSolvableProblem,
   countCases,
   loadVisibleSubmission,
   submissionView,
} = require("./helpers");

// Saved as QUEUED and answered at once. The verdict is polled for.
async function createSubmission(req, res) {
   const body = req.valid.body;
   const problem = await loadSolvableProblem(body.problemId, body.language);

   const submission = await Submission.create({
      userId: req.user._id,
      problemId: problem._id,
      language: body.language,
      sourceCode: body.sourceCode,
      isSampleRun: body.isSampleRun,
      totalTestCases: await countCases(problem._id, body.isSampleRun),
   });

   enqueue(submission._id);

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
