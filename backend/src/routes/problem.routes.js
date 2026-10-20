const { Router } = require("express");

const controller = require("../controllers/problems");
const requireAuth = require("../middlewares/requireAuth");
const optionalAuth = require("../middlewares/optionalAuth");
const requireRole = require("../middlewares/requireRole");
const validate = require("../middlewares/validate");
const schemas = require("../validators/problem.validators");

const router = Router();

// Everything below the line needs one of these two roles.
const requireSetter = [requireAuth, requireRole(["SETTER", "ADMIN"])];

// --- open, a token only adds the draft fields --------------------------
router.get(
   "/",
   optionalAuth,
   validate({ query: schemas.listProblemsQuerySchema }),
   controller.listProblems,
);

// Above /:slug, or "tags" reads as a slug. assertSlugFree reserves the word too.
router.get(
   "/tags",
   optionalAuth,
   validate({ query: schemas.tagsQuerySchema }),
   controller.listTags,
);

router.get(
   "/:slug",
   optionalAuth,
   validate({ params: schemas.problemSlugSchema }),
   controller.getProblem,
);

// --- writing a problem -------------------------------------------------
router.get(
   "/:slug/edit",
   requireSetter,
   validate({ params: schemas.problemSlugSchema }),
   controller.getProblemForEdit,
);

router.post(
   "/",
   requireSetter,
   validate({ body: schemas.createProblemSchema }),
   controller.createProblem,
);

router.patch(
   "/:id",
   requireSetter,
   validate({
      params: schemas.problemIdSchema,
      body: schemas.updateProblemSchema,
   }),
   controller.updateProblem,
);

router.delete(
   "/:id",
   requireSetter,
   validate({ params: schemas.problemIdSchema }),
   controller.deleteProblem,
);

// --- test cases, hidden ones included ----------------------------------
router.get(
   "/:id/test-cases",
   requireSetter,
   validate({ params: schemas.problemIdSchema }),
   controller.listTestCases,
);

router.post(
   "/:id/test-cases",
   requireSetter,
   validate({
      params: schemas.problemIdSchema,
      body: schemas.createTestCaseSchema,
   }),
   controller.addTestCase,
);

router.patch(
   "/:id/test-cases/:testCaseId",
   requireSetter,
   validate({
      params: schemas.testCaseParamsSchema,
      body: schemas.updateTestCaseSchema,
   }),
   controller.updateTestCase,
);

router.delete(
   "/:id/test-cases/:testCaseId",
   requireSetter,
   validate({ params: schemas.testCaseParamsSchema }),
   controller.deleteTestCase,
);

module.exports = router;
