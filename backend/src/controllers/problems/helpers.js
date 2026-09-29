// Shared by the problem handlers. Nothing here touches res: it returns a value.
const { Problem, TestCase } = require("../../models");
const { ApiError } = require("../../utils/ApiError");
const { slugify } = require("../../utils/slug");
const { runTransaction } = require("../../utils/transaction");

/* ---- who is allowed to see and do what -------------------------------- */

// Only these two roles know a draft exists.
const canSeeDrafts = (user) =>
   Boolean(user) && (user.role === "SETTER" || user.role === "ADMIN");

// A setter owns what they wrote. An admin owns everything.
const owns = (user, problem) =>
   user.role === "ADMIN" || String(problem.createdBy) === String(user._id);

/* ---- shaping the response --------------------------------------------- */

// Percent of submissions that passed, or null before the first one.
const acceptanceRate = (stats) =>
   stats.totalSubmissions > 0
      ? Math.round(
           (stats.acceptedSubmissions / stats.totalSubmissions) * 1000,
        ) / 10
      : null;

// Starter code for the languages this problem accepts, and nothing else.
const starterFor = (problem) =>
   Object.fromEntries(
      problem.supportedLanguages.map((language) => [
         language,
         problem.starterCode?.[language] || "",
      ]),
   );

// One row in the list. Draft fields are added only for a setter or admin.
const problemCard = (problem, { showDraftFields }) => ({
   id: problem._id,
   title: problem.title,
   slug: problem.slug,
   difficulty: problem.difficulty,
   tags: problem.tags,
   acceptanceRate: acceptanceRate(problem.stats),
   solvedByCount: problem.stats.solvedByCount,
   totalSubmissions: problem.stats.totalSubmissions,
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

// The full case, for the setter who owns the problem.
const fullCase = (row) => ({
   id: row._id,
   order: row.order,
   input: row.input,
   expectedOutput: row.expectedOutput,
   isHidden: row.isHidden,
   explanation: row.explanation,
   weight: row.weight,
   createdAt: row.createdAt,
   updatedAt: row.updatedAt,
});

// The problem page. Samples are passed in, already filtered.
const problemDetail = (problem, samples) => ({
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
   isPublished: problem.isPublished,
   createdAt: problem.createdAt,
   updatedAt: problem.updatedAt,
});

// The cases the problem page may show. Hidden ones are left in the database.
const loadSamples = (problemId) =>
   TestCase.find({ problemId, isHidden: false })
      .sort({ order: 1 })
      .select("order input expectedOutput explanation");

/* ---- building the list query ------------------------------------------ */

const SORTS = {
   NEWEST: { createdAt: -1 },
   OLDEST: { createdAt: 1 },
   TITLE: { title: 1 },
   // By rank, not by name, or HARD would land between EASY and MEDIUM.
   DIFFICULTY: { difficultyRank: 1, title: 1 },
};

const listSort = (key) => SORTS[key] || SORTS.NEWEST;

// Anyone without the role sees published problems, whatever they asked for.
function listFilter(query, user) {
   const status = canSeeDrafts(user) ? query.status : "PUBLISHED";
   const filter = {};

   if (status === "PUBLISHED") filter.isPublished = true;
   if (status === "DRAFT") filter.isPublished = false;

   if (query.mine && user) filter.createdBy = user._id;
   if (query.difficulty) filter.difficulty = query.difficulty;
   if (query.tags?.length) filter.tags = { $all: query.tags };

   // Whole words only: the text index does not match a half typed one.
   if (query.q) filter.$text = { $search: query.q };

   return filter;
}

/* ---- loading a problem before changing it ----------------------------- */

async function loadOwnProblem(id, user) {
   const problem = await Problem.findById(id);

   if (!problem) throw ApiError.notFound("No such problem");
   if (!owns(user, problem))
      throw ApiError.forbidden("This is not your problem");

   return problem;
}

async function loadOwnTestCase(params, user) {
   const problem = await loadOwnProblem(params.id, user);
   const testCase = await TestCase.findOne({
      _id: params.testCaseId,
      problemId: problem._id,
   });

   if (!testCase) throw ApiError.notFound("No such test case");

   return { problem, testCase };
}

/* ---- slugs ------------------------------------------------------------ */

// Use the slug that was sent, else make one from the title.
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
   const filter = exceptId ? { slug, _id: { $ne: exceptId } } : { slug };

   if (await Problem.exists(filter)) {
      throw ApiError.conflict("Another problem already uses that slug");
   }
}

// Two setters saving the same slug at the same moment land here.
const isDuplicateKey = (err) => Boolean(err) && err.code === 11000;

/* ---- test case bookkeeping -------------------------------------------- */

// Copy the real count onto the problem, so the list page needs no join.
async function syncTestCaseCount(problemId, session) {
   const count = await TestCase.countDocuments({ problemId }, { session });

   await Problem.updateOne(
      { _id: problemId },
      { $set: { testCaseCount: count } },
      { session },
   );

   return count;
}

// New cases go last. Gaps left by a delete are fine, only the order matters.
async function nextOrder(problemId, session) {
   const last = await TestCase.findOne({ problemId })
      .session(session)
      .sort({ order: -1 })
      .select("order");

   return last ? last.order + 1 : 1;
}

// Two adds at once can pick the same number, and the unique index refuses the
// loser. Each round lets one through, so the cap beats any real contention.
const ORDER_ATTEMPTS = 25;

// The retry is outside the transaction: a clash aborts it, so the next try
// needs a new one. The row and the count move together.
async function insertTestCase(problemId, fields) {
   for (let attempt = 1; attempt <= ORDER_ATTEMPTS; attempt += 1) {
      try {
         return await runTransaction(async (session) => {
            const [testCase] = await TestCase.create(
               [
                  {
                     ...fields,
                     problemId,
                     order: await nextOrder(problemId, session),
                  },
               ],
               { session },
            );

            return {
               testCase,
               testCaseCount: await syncTestCaseCount(problemId, session),
            };
         });
      } catch (err) {
         // Anything but a clash on the order is a real failure.
         if (!isDuplicateKey(err)) throw err;
      }
   }

   // Never a 500: the caller is told plainly to send it again.
   throw ApiError.conflict("Could not pick a run order, please try again");
}

// Removes the case and fixes the count in one step, guards included, so a
// second delete arriving at the same moment cannot slip past them.
async function removeTestCase(problem, testCase) {
   return runTransaction(async (session) => {
      await assertCaseRemains(problem, session);
      await assertSampleRemains(problem, testCase, session);

      await testCase.deleteOne({ session });

      return syncTestCaseCount(problem._id, session);
   });
}

// The problem and every case it owns go together, or neither goes.
async function removeProblem(problem) {
   await runTransaction(async (session) => {
      await TestCase.deleteMany({ problemId: problem._id }, { session });
      await problem.deleteOne({ session });
   });
}

// A published problem must keep something to judge with. Counted live, not read
// off problem.testCaseCount, so a copy that has drifted cannot weaken the rule.
async function assertCaseRemains(problem, session) {
   if (!problem.isPublished) return;

   const total = await TestCase.countDocuments(
      { problemId: problem._id },
      { session },
   );

   if (total <= 1) {
      throw ApiError.badRequest(
         "A published problem needs at least one test case",
      );
   }
}

// And it must keep one sample, or the Run button has nothing to run.
async function assertSampleRemains(problem, testCase, session) {
   if (!problem.isPublished || testCase.isHidden) return;

   const samples = await TestCase.countDocuments(
      { problemId: problem._id, isHidden: false },
      { session },
   );

   if (samples <= 1) {
      throw ApiError.badRequest(
         "A published problem needs at least one sample case",
      );
   }
}

// A published problem needs cases to judge with and a sample to show.
async function assertPublishable(problem) {
   const total = await TestCase.countDocuments({ problemId: problem._id });

   if (total < 1) {
      throw ApiError.badRequest("Add at least one test case before publishing");
   }

   const samples = await TestCase.countDocuments({
      problemId: problem._id,
      isHidden: false,
   });

   if (samples < 1) {
      throw ApiError.badRequest(
         "Add at least one sample case before publishing",
      );
   }
}

module.exports = {
   canSeeDrafts,
   owns,
   problemCard,
   problemDetail,
   sampleCase,
   fullCase,
   loadSamples,
   listFilter,
   listSort,
   loadOwnProblem,
   loadOwnTestCase,
   pickSlug,
   assertSlugFree,
   isDuplicateKey,
   syncTestCaseCount,
   nextOrder,
   insertTestCase,
   removeTestCase,
   removeProblem,
   assertCaseRemains,
   assertSampleRemains,
   assertPublishable,
};
