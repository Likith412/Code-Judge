// One handler per /api/problems route. What they share is in ./helpers.
const { Problem, TestCase } = require("../../models");
const { ApiError } = require("../../utils/ApiError");
const { recordAudit } = require("../../utils/audit");

const {
   canSeeDrafts,
   owns,
   problemCard,
   problemDetail,
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
   assertCaseRemains,
   assertSampleRemains,
   assertPublishable,
} = require("./helpers");

// The list page needs these fields and no others.
const CARD_FIELDS =
   "title slug difficulty tags stats isPublished testCaseCount createdAt";

const SLUG_TAKEN = "Another problem already uses that slug";

/* ---- reading, open to everyone ---------------------------------------- */

async function listProblems(req, res) {
   const query = req.valid.query;
   const filter = listFilter(query, req.user);

   const [rows, total] = await Promise.all([
      Problem.find(filter)
         .select(CARD_FIELDS)
         .sort(listSort(query.sort))
         .skip((query.page - 1) * query.limit)
         .limit(query.limit),
      Problem.countDocuments(filter),
   ]);

   const showDraftFields = canSeeDrafts(req.user);

   res.json({
      problems: rows.map((row) => problemCard(row, { showDraftFields })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
   });
}

async function getProblem(req, res) {
   const problem = await Problem.findOne({ slug: req.valid.params.slug });

   // A draft looks missing to everyone but the setter who wrote it.
   const mayRead =
      problem && (problem.isPublished || (req.user && owns(req.user, problem)));

   if (!mayRead) throw ApiError.notFound("No such problem");

   const samples = await loadSamples(problem._id);

   res.json({ problem: problemDetail(problem, samples) });
}

/* ---- writing a problem, setter and admin only ------------------------- */

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
      if (isDuplicateKey(err)) throw ApiError.conflict(SLUG_TAKEN);
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
   const problem = await loadOwnProblem(req.valid.params.id, req.user);

   if (body.slug) await assertSlugFree(body.slug, problem._id);

   // Going live is the one change with a condition attached.
   if (body.isPublished === true && !problem.isPublished) {
      await assertPublishable(problem);
   }

   problem.set(body);

   try {
      await problem.save();
   } catch (err) {
      if (isDuplicateKey(err)) throw ApiError.conflict(SLUG_TAKEN);
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

   await TestCase.deleteMany({ problemId: problem._id });
   await problem.deleteOne();

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
   const body = req.valid.body;
   const problem = await loadOwnProblem(req.valid.params.id, req.user);

   const testCase = await TestCase.create({
      ...body,
      problemId: problem._id,
      order: body.order || (await nextOrder(problem._id)),
   });

   const testCaseCount = await syncTestCaseCount(problem._id);

   res.status(201).json({ testCase: fullCase(testCase), testCaseCount });
}

async function updateTestCase(req, res) {
   const body = req.valid.body;
   const { problem, testCase } = await loadOwnTestCase(
      req.valid.params,
      req.user,
   );

   // Hiding the last sample would leave a live problem with nothing to show.
   if (body.isHidden === true) await assertSampleRemains(problem, testCase);

   testCase.set(body);
   await testCase.save();

   res.json({ testCase: fullCase(testCase) });
}

async function deleteTestCase(req, res) {
   const { problem, testCase } = await loadOwnTestCase(
      req.valid.params,
      req.user,
   );

   assertCaseRemains(problem);
   await assertSampleRemains(problem, testCase);

   await testCase.deleteOne();

   const testCaseCount = await syncTestCaseCount(problem._id);

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
   getProblem,
   createProblem,
   updateProblem,
   deleteProblem,
   listTestCases,
   addTestCase,
   updateTestCase,
   deleteTestCase,
};
