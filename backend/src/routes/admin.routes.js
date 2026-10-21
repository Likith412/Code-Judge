const { Router } = require("express");
const controller = require("../controllers/admin");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const validate = require("../middlewares/validate");
const schemas = require("../validators/admin.validators");

const router = Router();

router.use(requireAuth, requireRole(["ADMIN"]));

router.get(
   "/users",
   validate({ query: schemas.listUsersSchema }),
   controller.listUsers,
);

router.patch(
   "/users/:id",
   validate({ params: schemas.userIdSchema, body: schemas.updateUserSchema }),
   controller.updateUser,
);

router.post(
   "/users/:id/logout",
   validate({ params: schemas.userIdSchema }),
   controller.forceLogout,
);

router.get(
   "/audit",
   validate({ query: schemas.auditSchema }),
   controller.listAudit,
);

module.exports = router;
