const { Router } = require("express");
const controller = require("../controllers/contests");
const optionalAuth = require("../middlewares/optionalAuth");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const validate = require("../middlewares/validate");
const schemas = require("../validators/contest.validators");

const router = Router();

router.get(
   "/",
   optionalAuth,
   validate({ query: schemas.contestListSchema }),
   controller.listContests,
);

router.post(
   "/",
   requireAuth,
   requireRole(["ADMIN"]),
   validate({ body: schemas.writeSchema }),
   controller.saveContest,
);

router.patch(
   "/:id",
   requireAuth,
   requireRole(["ADMIN"]),
   validate({ params: schemas.idSchema, body: schemas.writeSchema }),
   controller.saveContest,
);

router.get(
   "/:slug",
   optionalAuth,
   validate({ params: schemas.contestParamsSchema }),
   controller.getContest,
);

router.get(
   "/:slug/problems/:problemSlug",
   optionalAuth,
   validate({ params: schemas.contestProblemSchema }),
   controller.getProblem,
);

router.post(
   "/:slug/join",
   requireAuth,
   requireRole(["USER"]),
   validate({ params: schemas.contestParamsSchema }),
   controller.joinContest,
);

// End the contest early, for yourself only.
router.post(
   "/:slug/finish",
   requireAuth,
   requireRole(["USER"]),
   validate({ params: schemas.contestParamsSchema }),
   controller.finishContest,
);

router.get(
   "/:slug/rankings",
   optionalAuth,
   validate({ params: schemas.contestParamsSchema, query: schemas.listSchema }),
   controller.rankings,
);

module.exports = router;
