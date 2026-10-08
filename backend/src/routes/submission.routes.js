const { Router } = require("express");

const controller = require("../controllers/submissions");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const validate = require("../middlewares/validate");
const schemas = require("../validators/submission.validators");

const router = Router();

// Only a USER solves problems. A setter or an admin cannot submit.
router.post(
   "/",
   requireAuth,
   requireRole(["USER"]),
   validate({ body: schemas.createSubmissionSchema }),
   controller.createSubmission,
);

// The author, or an admin. Anyone else is told it does not exist.
router.get(
   "/:id",
   requireAuth,
   validate({ params: schemas.submissionIdSchema }),
   controller.getSubmission,
);

module.exports = router;
