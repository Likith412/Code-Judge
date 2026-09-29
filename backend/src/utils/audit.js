const logger = require("../config/logger");
const { AuditLog } = require("../models");

// Writing the log must never be the reason a request fails.
async function recordAudit(entry) {
   try {
      await AuditLog.create(entry);
   } catch (err) {
      logger.error({ err, action: entry.action }, "could not write audit log");
   }
}

module.exports = { recordAudit };
