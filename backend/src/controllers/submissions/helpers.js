// Shared by the submission handlers. Nothing here touches res: it returns a value.
const { Problem, Submission, TestCase, User } = require("../../models");
const { ApiError } = require("../../utils/ApiError");
const {
   JUDGED_LANGUAGES,
   PENDING_STATUSES,
} = require("../../utils/constants");

// At most this many waiting at once, per user.
const MAX_WAITING = 5;

/* ---- before saving ---------------------------------------------------- */

// A USER only ever sees published problems, so a draft is simply missing.
async function loadSolvableProblem(problemId, language) {
   const problem = await Problem.findOne({ _id: problemId, isPublished: true });

   if (!problem) throw ApiError.notFound("No such problem");

   if (!problem.supportedLanguages.includes(language)) {
      throw ApiError.badRequest("This problem does not take that language");
   }

   // The worker only knows Java until phase 8.
   if (!JUDGED_LANGUAGES.includes(language)) {
      throw ApiError.badRequest("Only Java can run for now");
   }

   return problem;
}

const countWaiting = (userId) =>
   Submission.countDocuments({ userId, status: { $in: PENDING_STATUSES } });

const tooMany = () =>
   ApiError.rateLimited(
      `You already have ${MAX_WAITING} waiting to be judged. Wait for one to finish.`,
   );

// One user cannot fill the queue.
async function checkWaiting(userId) {
   if ((await countWaiting(userId)) >= MAX_WAITING) throw tooMany();
}

// Counts again after saving, to catch requests sent at the same moment.
async function confirmWaiting(submission) {
   if ((await countWaiting(submission.userId)) > MAX_WAITING) {
      await Submission.deleteOne({ _id: submission._id });
      throw tooMany();
   }
}

// Run checks the samples, Submit checks everything.
const countCases = (problemId, isSampleRun) =>
   TestCase.countDocuments(
      isSampleRun ? { problemId, isHidden: false } : { problemId },
   );

/* ---- reading one back ------------------------------------------------- */

// Author or admin only. Anyone else gets a 404.
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
   testCasesPassed: row.testCasesPassed,
   totalTestCases: row.totalTestCases,
   failedTestIndex: row.failedTestIndex,
   errorMessage: row.errorMessage,
   sampleResults: row.sampleResults,
   isSampleRun: row.isSampleRun,
   createdAt: row.createdAt,
   judgedAt: row.judgedAt,
});

// What the detail page shows around the code: the problem and whose it is.
async function submissionContext(submission) {
   const [problem, author] = await Promise.all([
      Problem.findById(submission.problemId).select(
         "title slug timeLimitMs memoryLimitMb",
      ),
      User.findById(submission.userId).select("username"),
   ]);

   return {
      problem: problem && {
         title: problem.title,
         slug: problem.slug,
         timeLimitMs: problem.timeLimitMs,
         memoryLimitMb: problem.memoryLimitMb,
      },
      author: author && { username: author.username },
   };
}

/* ---- my submissions --------------------------------------------------- */

// Run is not history, so only Submit rows are listed.
function mineFilter(userId, query) {
   const filter = { userId, isSampleRun: false };

   if (query.problemId) filter.problemId = query.problemId;
   if (query.language) filter.language = query.language;
   if (query.status) filter.status = query.status;

   return filter;
}

// Titles for a page of rows, in one query.
async function problemsById(ids) {
   const problems = await Problem.find({ _id: { $in: ids } }).select(
      "title slug",
   );

   return new Map(problems.map((problem) => [String(problem._id), problem]));
}

// Every problem this user submitted to, for the problem filter.
async function submittedProblems(userId) {
   const ids = await Submission.distinct("problemId", {
      userId,
      isSampleRun: false,
   });
   const problems = await Problem.find({ _id: { $in: ids } })
      .select("title")
      .sort({ title: 1 });

   return problems.map((problem) => ({ id: problem._id, title: problem.title }));
}

// One row in the list. The code is left out, the detail page has it.
const historyRow = (row, problems) => {
   const problem = problems.get(String(row.problemId));

   return {
      id: row._id,
      problem: problem
         ? { id: problem._id, title: problem.title, slug: problem.slug }
         : null,
      language: row.language,
      status: row.status,
      testCasesPassed: row.testCasesPassed,
      totalTestCases: row.totalTestCases,
      createdAt: row.createdAt,
   };
};

module.exports = {
   loadSolvableProblem,
   checkWaiting,
   confirmWaiting,
   countCases,
   loadVisibleSubmission,
   submissionView,
   submissionContext,
   mineFilter,
   problemsById,
   submittedProblems,
   historyRow,
};
