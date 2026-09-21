const { AuditLog } = require("../models");
const logger = require("../config/logger");

// Writing the log must never be the reason a request fails.
async function record(entry) {
   try {
      await AuditLog.create(entry);
   } catch (err) {
      logger.error({ err, action: entry.action }, "could not write audit log");
   }
}

module.exports = { record };
