// Shared by the problem handlers. Nothing here touches res: it returns a value.
const { Problem, Submission, TestCase, Contest } = require("../../models");

const { ApiError } = require("../../utils/ApiError");
const { slugify } = require("../../utils/slug");
const { RESERVED_SLUGS } = require("../../utils/constants");
const { runTransaction } = require("../../utils/transaction");
const { containsText } = require("../../utils/search");

/* ---- who is allowed to see and do what -------------------------------- */

const canSeeDrafts = (user) =>
   Boolean(user) && (user.role === "SETTER" || user.role === "ADMIN");

const canSolve = (user) => user?.role === "USER";

const owns = (user, problem) =>
   user.role === "ADMIN" || String(problem.createdBy) === String(user._id);

// problemId => solved for a USER, or => null for anyone who cannot solve.
function solvedChecker(user) {
   if (!canSolve(user)) return () => null;

   const solved = new Set((user.solvedProblemIds || []).map(String));

   return (problemId) => solved.has(String(problemId));
}

/* ---- the list page ---------------------------------------------------- */

const attemptedIds = (user) =>
   Submission.distinct("problemId", { userId: user._id, isSampleRun: false });

// Anyone without the role sees published problems, whatever they asked for.
async function listFilter(query, user) {
   const status = canSeeDrafts(user) ? query.status : "PUBLISHED";
   const filter = {};

   if (status === "PUBLISHED") filter.isPublished = true;
   if (status === "DRAFT") filter.isPublished = false;
   if (query.mine && user) filter.createdBy = user._id;

   // A setter's drafts are their own, as on the detail page; only an admin sees all.
   if (user?.role === "SETTER" && status !== "PUBLISHED") {
      filter.$or = [{ isPublished: true }, { createdBy: user._id }];
   }

   if (canSolve(user) && query.progress) {
      const solved = user.solvedProblemIds || [];

      if (query.progress === "solved") filter._id = { $in: solved };
      if (query.progress === "unsolved") filter._id = { $nin: solved };

      if (query.progress === "tried") {
         filter._id = { $in: await attemptedIds(user), $nin: solved };
      }
   }

   if (query.difficulty) filter.difficulty = query.difficulty;

   if (query.tags?.length) filter.tags = { $in: query.tags };

   if (query.q) filter.title = containsText(query.q);

   return filter;
}

async function tagCounts(filter) {
   const rows = await Problem.aggregate([
      { $match: filter },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
   ]);

   return rows.map((row) => ({ tag: row._id, count: row.count }));
}

/* ---- shaping the response --------------------------------------------- */

const acceptanceRate = (stats) =>
   stats.totalSubmissions > 0
      ? Math.round(
           (stats.acceptedSubmissions / stats.totalSubmissions) * 1000,
        ) / 10
      : null;

const starterFor = (problem) =>
   Object.fromEntries(
      problem.supportedLanguages.map((language) => [
         language,
         problem.starterCode?.[language] || "",
      ]),
   );

const problemCard = (problem, { showDraftFields, solved }) => ({
   id: problem._id,
   title: problem.title,
   slug: problem.slug,
   difficulty: problem.difficulty,
   tags: problem.tags,
   acceptanceRate: acceptanceRate(problem.stats),
   solvedByCount: problem.stats.solvedByCount,
   totalSubmissions: problem.stats.totalSubmissions,
   ...(solved === null ? {} : { solved }),
   ...(showDraftFields
      ? {
           isPublished: problem.isPublished,
           testCaseCount: problem.testCaseCount,
           createdAt: problem.createdAt,
        }
      : {}),
});

// A sample case is public. Hidden cases never go through this function.
const sampleCase = (row) => ({
   id: row._id,
   order: row.order,
   input: row.input,
   expectedOutput: row.expectedOutput,
   explanation: row.explanation,
});

const problemDetail = (problem, samples, solved = null) => ({
   id: problem._id,
   title: problem.title,
   slug: problem.slug,
   description: problem.description,
   difficulty: problem.difficulty,
   constraints: problem.constraints,
   examples: problem.examples,
   starterCode: starterFor(problem),
   supportedLanguages: problem.supportedLanguages,
   tags: problem.tags,
   timeLimitMs: problem.timeLimitMs,
   memoryLimitMb: problem.memoryLimitMb,
   comparisonMode: problem.comparisonMode,
   testCaseCount: problem.testCaseCount,
   sampleTestCases: samples.map(sampleCase),
   acceptanceRate: acceptanceRate(problem.stats),
   stats: {
      totalSubmissions: problem.stats.totalSubmissions,
      acceptedSubmissions: problem.stats.acceptedSubmissions,
      solvedByCount: problem.stats.solvedByCount,
   },
   ...(solved === null ? {} : { solved }),
   isPublished: problem.isPublished,
   createdAt: problem.createdAt,
   updatedAt: problem.updatedAt,
});

const loadSamples = (problemId) =>
   TestCase.find({ problemId, isHidden: false })
      .sort({ order: 1 })
      .select("order input expectedOutput explanation");

/* ---- loading a problem before changing it ----------------------------- */

const inAnyContest = (problemId, session = null) =>
   Contest.exists({ "problems.problemId": problemId }).session(session);

async function assertContestEditable(problemId, session = null) {
   const locked = await Contest.exists({
      "problems.problemId": problemId,
      isPublished: true,
   }).session(session);

   if (locked) {
      throw ApiError.badRequest(
         "Problems in a published contest cannot be changed",
      );
   }
}

async function loadOwnProblem(id, user, session = null) {
   const problem = await Problem.findById(id).session(session);

   if (!problem) throw ApiError.notFound("No such problem");

   if (!owns(user, problem)) {
      throw ApiError.forbidden("This is not your problem");
   }

   return problem;
}

async function loadEditableProblem(id, user, session = null) {
   const problem = await loadOwnProblem(id, user, session);

   await assertContestEditable(problem._id, session);

   return problem;
}

async function loadOwnProblemBySlug(slug, user) {
   const found = await Problem.findOne({ slug }).select("_id");

   if (!found) throw ApiError.notFound("No such problem");

   return loadOwnProblem(found._id, user);
}

/* ---- slugs ------------------------------------------------------------ */

function pickSlug({ title, slug }) {
   const chosen = slug || slugify(title || "");

   if (!chosen) {
      throw ApiError.validation(
         "Send a slug: the title has no letters or digits",
      );
   }

   return chosen;
}

async function assertSlugFree(slug, exceptId) {
   // /problems/tags is a route, so no problem may answer to that slug.
   if (RESERVED_SLUGS.includes(slug)) {
      throw ApiError.conflict(`"${slug}" is reserved, pick another slug`);
   }

   const filter = exceptId ? { slug, _id: { $ne: exceptId } } : { slug };

   if (await Problem.exists(filter)) {
      throw ApiError.conflict("Another problem already uses that slug");
   }
}

const isDuplicateKey = (err) => Boolean(err) && err.code === 11000;

/* ---- publishing ------------------------------------------------------- */

async function assertPublishable(problem, session = null) {
   const total = await TestCase.countDocuments({
      problemId: problem._id,
   }).session(session);

   if (total < 1) {
      throw ApiError.badRequest("Add at least one test case before publishing");
   }

   const samples = await TestCase.countDocuments({
      problemId: problem._id,
      isHidden: false,
   }).session(session);

   if (samples < 1) {
      throw ApiError.badRequest(
         "Add at least one sample case before publishing",
      );
   }
}

// A contest question is published with its contest, never on its own.
async function assertCanPublish(problem, session) {
   if (await inAnyContest(problem._id, session)) {
      throw ApiError.badRequest(
         "Contest problems stay private; publish the contest instead",
      );
   }

   await assertPublishable(problem, session);
}

async function removeProblem(problem) {
   await runTransaction(async (session) => {
      if (await inAnyContest(problem._id, session)) {
         throw ApiError.badRequest(
            "Remove this problem from its draft contest before deleting it",
         );
      }

      await TestCase.deleteMany({ problemId: problem._id }, { session });
      await problem.deleteOne({ session });
   });
}

module.exports = {
   canSeeDrafts,
   owns,
   solvedChecker,
   listFilter,
   tagCounts,
   problemCard,
   problemDetail,
   loadSamples,
   assertContestEditable,
   loadOwnProblem,
   loadEditableProblem,
   loadOwnProblemBySlug,
   pickSlug,
   assertSlugFree,
   isDuplicateKey,
   assertPublishable,
   assertCanPublish,
   removeProblem,
};
