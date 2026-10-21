// One handler per /api/problems route. What they share is in ./helpers.
const { Problem, TestCase } = require("../../models");

const { ApiError } = require("../../utils/ApiError");
const { recordAudit } = require("../../utils/audit");
const { runTransaction } = require("../../utils/transaction");
const { pageView } = require("../../utils/pagination");

const {
   canSeeDrafts,
   owns,
   solvedChecker,
   listFilter,
   tagCounts,
   problemCard,
   problemDetail,
   loadSamples,
   loadOwnProblem,
   loadEditableProblem,
   loadOwnProblemBySlug,
   pickSlug,
   assertSlugFree,
   isDuplicateKey,
   assertCanPublish,
   removeProblem,
} = require("./helpers");

const {
   fullCase,
   insertTestCase,
   saveTestCase,
   loadOwnTestCase,
   removeTestCase,
} = require("./testCases");

/* ---- reading, open to everyone ---------------------------------------- */

async function listProblems(req, res) {
   const query = req.valid.query;
   const filter = await listFilter(query, req.user);

   const [rows, total] = await Promise.all([
      Problem.find(filter)
         .select(
            "title slug difficulty tags stats isPublished testCaseCount createdAt",
         )
         .sort(
            {
               NEWEST: { createdAt: -1 },
               OLDEST: { createdAt: 1 },
               TITLE: { title: 1 },
               // By rank, not by name, or HARD would land between EASY and MEDIUM.
               DIFFICULTY: { difficultyRank: 1, title: 1 },
            }[query.sort],
         )
         .skip((query.page - 1) * query.limit)
         .limit(query.limit),
      Problem.countDocuments(filter),
   ]);

   const showDraftFields = canSeeDrafts(req.user);
   const isSolved = solvedChecker(req.user);

   const cards = rows.map((row) =>
      problemCard(row, { showDraftFields, solved: isSolved(row._id) }),
   );

   res.json(pageView("problems", cards, total, query));
}

// Same visibility rules as the list, so the counts match what you can see.
async function listTags(req, res) {
   const filter = await listFilter(req.valid.query, req.user);
   const tags = await tagCounts(filter);

   res.json({ tags, total: tags.length });
}

async function getProblem(req, res) {
   const problem = await Problem.findOne({ slug: req.valid.params.slug });

   // A draft looks missing to everyone but the setter who wrote it.
   const mayRead =
      problem && (problem.isPublished || (req.user && owns(req.user, problem)));

   if (!mayRead) throw ApiError.notFound("No such problem");

   const samples = await loadSamples(problem._id);

   res.json({
      problem: problemDetail(
         problem,
         samples,
         solvedChecker(req.user)(problem._id),
      ),
   });
}

/* ---- writing a problem, setter and admin only ------------------------- */

// The editor's url has the slug. Writes still go by id, which never changes.
async function getProblemForEdit(req, res) {
   const problem = await loadOwnProblemBySlug(req.valid.params.slug, req.user);
   const samples = await loadSamples(problem._id);

   res.json({ problem: problemDetail(problem, samples) });
}

async function createProblem(req, res) {
   const body = req.valid.body;
   const slug = pickSlug(body);

   await assertSlugFree(slug);

   let problem;

   try {
      problem = await Problem.create({
         ...body,
         slug,
         createdBy: req.user._id,
      });
   } catch (err) {
      // Someone saved the same slug in the moment between the check and here.
      if (isDuplicateKey(err))
         throw ApiError.conflict("Another problem already uses that slug");

      throw err;
   }

   await recordAudit({
      actorId: req.user._id,
      action: "PROBLEM_CREATED",
      targetType: "PROBLEM",
      targetId: problem._id,
      meta: { slug },
      ip: req.ip,
   });

   res.status(201).json({ problem: problemDetail(problem, []) });
}

async function updateProblem(req, res) {
   const body = req.valid.body;
   let problem;

   try {
      problem = await runTransaction(async (session) => {
         const found = await loadEditableProblem(
            req.valid.params.id,
            req.user,
            session,
         );

         if (body.slug) await assertSlugFree(body.slug, found._id);

         // The publish checks run whenever a draft is being published.
         if (body.isPublished === true && !found.isPublished) {
            await assertCanPublish(found, session);
         }

         found.set(body);

         await found.save({ session });

         return found;
      });
   } catch (err) {
      if (isDuplicateKey(err))
         throw ApiError.conflict("Another problem already uses that slug");

      throw err;
   }

   await recordAudit({
      actorId: req.user._id,
      action: "PROBLEM_UPDATED",
      targetType: "PROBLEM",
      targetId: problem._id,
      meta: { fields: Object.keys(body) },
      ip: req.ip,
   });

   const samples = await loadSamples(problem._id);

   res.json({ problem: problemDetail(problem, samples) });
}

async function deleteProblem(req, res) {
   const problem = await loadOwnProblem(req.valid.params.id, req.user);

   // Take it off the list first, so nothing live disappears by accident.
   if (problem.isPublished) {
      throw ApiError.badRequest("Unpublish the problem before deleting it");
   }

   await removeProblem(problem);

   await recordAudit({
      actorId: req.user._id,
      action: "PROBLEM_DELETED",
      targetType: "PROBLEM",
      targetId: problem._id,
      meta: { slug: problem.slug, title: problem.title },
      ip: req.ip,
   });

   res.json({ message: "The problem and its test cases are gone" });
}

/* ---- test cases, setter and admin only -------------------------------- */

async function listTestCases(req, res) {
   const problem = await loadOwnProblem(req.valid.params.id, req.user);

   const rows = await TestCase.find({ problemId: problem._id }).sort({
      order: 1,
   });

   res.json({ testCases: rows.map(fullCase), total: rows.length });
}

async function addTestCase(req, res) {
   const problem = await loadOwnProblem(req.valid.params.id, req.user);

   const { testCase, testCaseCount } = await insertTestCase(
      problem._id,
      req.valid.body,
   );

   res.status(201).json({ testCase: fullCase(testCase), testCaseCount });
}

async function updateTestCase(req, res) {
   const testCase = await saveTestCase(
      req.valid.params,
      req.user,
      req.valid.body,
   );

   res.json({ testCase: fullCase(testCase) });
}

async function deleteTestCase(req, res) {
   const { problem, testCase } = await loadOwnTestCase(
      req.valid.params,
      req.user,
   );

   const testCaseCount = await removeTestCase(problem, testCase);

   await recordAudit({
      actorId: req.user._id,
      action: "TEST_CASE_DELETED",
      targetType: "PROBLEM",
      targetId: problem._id,
      meta: { testCaseId: testCase._id, order: testCase.order },
      ip: req.ip,
   });

   res.json({ message: "That test case is gone", testCaseCount });
}

module.exports = {
   listProblems,
   listTags,
   getProblem,
   getProblemForEdit,
   createProblem,
   updateProblem,
   deleteProblem,
   listTestCases,
   addTestCase,
   updateTestCase,
   deleteTestCase,
};
