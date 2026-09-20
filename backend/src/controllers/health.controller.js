const { databaseState } = require("../config/db");

const getHealth = (req, res) => {
   const db = databaseState();

   res.status(db === "connected" ? 200 : 503).json({
      ok: db === "connected",
      db,
   });
};

module.exports = { getHealth };
