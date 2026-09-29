const { Router } = require("express");

const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const problemRoutes = require("./problem.routes");

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/problems", problemRoutes);

module.exports = router;
