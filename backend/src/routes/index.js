const { Router } = require("express");

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const problemRoutes = require("./problem.routes");
const submissionRoutes = require("./submission.routes");
const userRoutes = require("./user.routes");
const adminRoutes = require("./admin.routes");
const contestRoutes = require("./contest.routes");

const router = Router();

router.use("/health", healthRoutes);

router.use("/auth", authRoutes);

router.use("/problems", problemRoutes);

router.use("/submissions", submissionRoutes);

router.use("/users", userRoutes);

router.use("/admin", adminRoutes);

router.use("/contests", contestRoutes);

module.exports = router;
