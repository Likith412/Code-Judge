const { Router } = require("express");

const controller = require("../controllers/users.controller");
const validate = require("../middlewares/validate");
const schemas = require("../validators/user.validators");

const router = Router();

// Open to everyone, signed in or not.
router.get(
   "/:username",
   validate({ params: schemas.usernameParamSchema }),
   controller.getProfile,
);

module.exports = router;
