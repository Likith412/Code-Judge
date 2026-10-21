// One handler per /api/submissions route. What they share is in ./helpers.
const { Submission } = require("../../models");

const logger = require("../../config/logger");
const { addJudgeJob } = require("../../queue");
const { ApiError } = require("../../utils/ApiError");
const { recordAudit } = require("../../utils/audit");
const { pageView } = require("../../utils/pagination");

const {
   loadPracticeProblem,
   loadContestProblemToSubmit,
   assertLanguage,
   checkWaiting,
   confirmWaiting,
   countCases,
   loadVisibleSubmission,
   submissionView,
   submissionContext,
   mineFilter,
   problemsById,
   submittedProblems,
   submittedContests,
   historyRow,
} = require("./helpers");

/* ---- submitting ------------------------------------------------------- */

// Saved as QUEUED and answered at once. The worker judges it.
async function createSubmission(req, res) {
   const body = req.valid.body;

   // The server's receipt time decides the deadline, never a client timestamp.
   const receivedAt = new Date();

   const problem = body.contestId
      ? await loadContestProblemToSubmit(
           body.contestId,
           body.problemId,
           req.user,
           receivedAt,
        )
      : await loadPracticeProblem(body.problemId);

   assertLanguage(problem, body.language);

   await checkWaiting(req.user._id);

   const submission = await Submission.create({
      userId: req.user._id,
      problemId: problem._id,
      contestId: body.contestId,
      createdAt: receivedAt,
      language: body.language,
      sourceCode: body.sourceCode,
      isSampleRun: body.isSampleRun,
      totalTestCases: await countCases(problem._id, body.isSampleRun),
   });

   await confirmWaiting(submission);

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

/* ---- reading back ----------------------------------------------------- */

async function getSubmission(req, res) {
   const submission = await loadVisibleSubmission(
      req.valid.params.id,
      req.user,
   );

   // Only an admin can open someone else's, and that is always logged.
   if (String(submission.userId) !== String(req.user._id)) {
      await recordAudit({
         actorId: req.user._id,
         action: "ADMIN_SUBMISSION_OPENED",
         targetType: "SUBMISSION",
         targetId: submission._id,
         ip: req.ip,
      });
   }

   res.json({
      submission: submissionView(submission),
      ...(await submissionContext(submission)),
   });
}

// Newest first, plus the problems and contests you submitted to, for the filters.
async function listMySubmissions(req, res) {
   const query = req.valid.query;
   const filter = mineFilter(req.user._id, query);

   const [rows, total, problems, contests] = await Promise.all([
      Submission.find(filter)
         .select(
            "problemId language status testCasesPassed totalTestCases createdAt",
         )
         .sort({ createdAt: -1 })
         .skip((query.page - 1) * query.limit)
         .limit(query.limit),
      Submission.countDocuments(filter),
      submittedProblems(req.user._id),
      submittedContests(req.user._id),
   ]);

   const titles = await problemsById(rows.map((row) => row.problemId));

   res.json({
      ...pageView(
         "submissions",
         rows.map((row) => historyRow(row, titles)),
         total,
         query,
      ),
      problems,
      contests,
   });
}

module.exports = { createSubmission, getSubmission, listMySubmissions };
