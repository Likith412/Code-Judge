// Shared by the submission handlers. Nothing here touches res: it returns a value.
const { Problem, Submission, TestCase } = require("../../models");
const { ApiError } = require("../../utils/ApiError");
const { canRun } = require("../../judge");

/* ---- before saving ---------------------------------------------------- */

// A USER only ever sees published problems, so a draft is simply missing.
async function loadSolvableProblem(problemId, language) {
   const problem = await Problem.findOne({ _id: problemId, isPublished: true });

   if (!problem) throw ApiError.notFound("No such problem");

   if (!problem.supportedLanguages.includes(language)) {
      throw ApiError.badRequest("This problem does not take that language");
   }

   // The local judge only knows Java until phase 8.
   if (!canRun(language)) {
      throw ApiError.badRequest("Only Java can run for now");
   }

   return problem;
}

// Run checks the samples, Submit checks everything.
const countCases = (problemId, isSampleRun) =>
   TestCase.countDocuments(
      isSampleRun ? { problemId, isHidden: false } : { problemId },
   );

/* ---- reading one back ------------------------------------------------- */

// The author reads their own. An admin reads anyone's. Everyone else gets a 404.
async function loadVisibleSubmission(id, user) {
   const submission = await Submission.findById(id);
   const mayRead =
      submission &&
      (user.role === "ADMIN" || String(submission.userId) === String(user._id));

   if (!mayRead) throw ApiError.notFound("No such submission");

   return submission;
}

// Only what the result panel and the detail page need.
const submissionView = (row) => ({
   id: row._id,
   problemId: row.problemId,
   userId: row.userId,
   language: row.language,
   sourceCode: row.sourceCode,
   status: row.status,
   runtimeMs: row.runtimeMs,
   memoryKb: row.memoryKb,
   testCasesPassed: row.testCasesPassed,
   totalTestCases: row.totalTestCases,
   failedTestIndex: row.failedTestIndex,
   errorMessage: row.errorMessage,
   sampleResults: row.sampleResults,
   isSampleRun: row.isSampleRun,
   createdAt: row.createdAt,
   judgedAt: row.judgedAt,
});

module.exports = {
   loadSolvableProblem,
   countCases,
   loadVisibleSubmission,
   submissionView,
};
