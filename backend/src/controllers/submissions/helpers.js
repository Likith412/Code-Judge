// Shared by the submission handlers. Nothing here touches res: it returns a value.
const {
   Problem,
   Submission,
   TestCase,
   User,
   Contest,
} = require("../../models");

const { ApiError } = require("../../utils/ApiError");
const { JUDGED_LANGUAGES, PENDING_STATUSES } = require("../../utils/constants");
const {
   findParticipant,
   loadContestProblem,
   assertCanSubmit,
} = require("../contests/helpers");

/* ---- before saving ---------------------------------------------------- */

// Outside a contest a USER only sees published problems, so a draft is missing.
async function loadPracticeProblem(problemId) {
   const problem = await Problem.findOne({ _id: problemId, isPublished: true });

   if (!problem) throw ApiError.notFound("No such problem");

   return problem;
}

async function loadContestProblemToSubmit(contestId, problemId, user, now) {
   const contest = await Contest.findById(contestId);

   // A draft looks missing, as it does on the contest page.
   if (!contest || !contest.isPublished) {
      throw ApiError.notFound("No such contest");
   }

   const participant = await findParticipant(contest._id, user);

   assertCanSubmit(contest, participant, now);

   return loadContestProblem(contest, problemId);
}

function assertLanguage(problem, language) {
   if (!problem.supportedLanguages.includes(language)) {
      throw ApiError.badRequest("This problem does not take that language");
   }

   // The worker only knows Java until phase 8.
   if (!JUDGED_LANGUAGES.includes(language)) {
      throw ApiError.badRequest("Only Java can run for now");
   }
}

const countWaiting = (userId) =>
   Submission.countDocuments({ userId, status: { $in: PENDING_STATUSES } });

const tooMany = () =>
   ApiError.rateLimited(
      "You already have 5 waiting to be judged. Wait for one to finish.",
   );

// One user cannot fill the queue.
async function checkWaiting(userId) {
   if ((await countWaiting(userId)) >= 5) throw tooMany();
}

// Counts again after saving, to catch requests sent at the same moment.
async function confirmWaiting(submission) {
   if ((await countWaiting(submission.userId)) > 5) {
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
   contestId: row.contestId,
   createdAt: row.createdAt,
   judgedAt: row.judgedAt,
});

async function submissionContext(submission) {
   const contest = submission.contestId
      ? await Contest.findById(submission.contestId).select("slug title")
      : null;

   const [problem, author] = await Promise.all([
      Problem.findById(submission.problemId).select(
         "title slug timeLimitMs memoryLimitMb",
      ),
      User.findById(submission.userId).select("username"),
   ]);

   return {
      contest: contest ? { slug: contest.slug, title: contest.title } : null,
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
   if (query.contestId) filter.contestId = query.contestId;
   if (query.language) filter.language = query.language;
   if (query.status) filter.status = query.status;

   return filter;
}

async function problemsById(ids) {
   const problems = await Problem.find({ _id: { $in: ids } }).select(
      "title slug",
   );

   return new Map(problems.map((problem) => [String(problem._id), problem]));
}

async function submittedProblems(userId) {
   const ids = await Submission.distinct("problemId", {
      userId,
      isSampleRun: false,
   });

   const problems = await Problem.find({ _id: { $in: ids } })
      .select("title")
      .sort({ title: 1 });

   return problems.map((problem) => ({
      id: problem._id,
      title: problem.title,
   }));
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

async function submittedContests(userId) {
   const ids = await Submission.distinct("contestId", {
      userId,
      isSampleRun: false,
      contestId: { $ne: null },
   });

   const contests = await Contest.find({ _id: { $in: ids } })
      .select("title")
      .sort({ startTime: -1 });

   return contests.map((contest) => ({
      id: contest._id,
      title: contest.title,
   }));
}

module.exports = {
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
};
