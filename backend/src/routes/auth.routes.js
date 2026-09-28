const { Router } = require("express");

const controller = require("../controllers/auth.controller");
const requireAuth = require("../middlewares/requireAuth");
const requireAllowedOrigin = require("../middlewares/requireAllowedOrigin");
const validate = require("../middlewares/validate");
const schemas = require("../validators/auth.validators");

const router = Router();

// --- open, no token needed ---------------------------------------------
router.post(
   "/register",
   validate({ body: schemas.registerSchema }),
   controller.register,
);
router.post(
   "/resend-verification",
   validate({ body: schemas.emailOnlySchema }),
   controller.resendVerification,
);
router.get(
   "/verify",
   validate({ query: schemas.verifyQuerySchema }),
   controller.verify,
);
router.post(
   "/login",
   validate({ body: schemas.loginSchema }),
   controller.login,
);
router.post(
   "/forgot-password",
   validate({ body: schemas.emailOnlySchema }),
   controller.forgotPassword,
);
router.post(
   "/reset-password",
   validate({ body: schemas.resetPasswordSchema }),
   controller.resetPassword,
);

// --- the only two routes that read the refresh cookie -------------------
router.post("/refresh", requireAllowedOrigin, controller.refresh);
router.post("/logout", requireAllowedOrigin, controller.logout);

// --- need an access token ----------------------------------------------
router.get("/me", requireAuth, controller.me);
router.patch(
   "/me",
   requireAuth,
   validate({ body: schemas.updateProfileSchema }),
   controller.updateMe,
);
router.post("/logout-all", requireAuth, controller.logoutAll);
router.get("/sessions", requireAuth, controller.listSessions);
router.delete(
   "/sessions/:id",
   requireAuth,
   validate({ params: schemas.sessionIdSchema }),
   controller.revokeSession,
);
router.post(
   "/change-password",
   requireAuth,
   validate({ body: schemas.changePasswordSchema }),
   controller.changePassword,
);

module.exports = router;
