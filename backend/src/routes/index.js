const { Router } = require("express");

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const problemRoutes = require("./problem.routes");
const submissionRoutes = require("./submission.routes");
const userRoutes = require("./user.routes");

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/problems", problemRoutes);
router.use("/submissions", submissionRoutes);
router.use("/users", userRoutes);

module.exports = router;
