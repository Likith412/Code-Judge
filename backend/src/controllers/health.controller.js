// The one /api/health route.
const { databaseState } = require("../config/db");
const { redisState } = require("../config/redis");

// Without Redis nothing can be submitted, so it counts too.
const getHealth = (req, res) => {
   const db = databaseState();
   const redis = redisState();
   const ok = db === "connected" && redis === "ready";

   res.status(ok ? 200 : 503).json({ ok, db, redis });
};

module.exports = { getHealth };
