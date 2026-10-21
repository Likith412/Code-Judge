// One handler per /api/admin route. What they share is in ./helpers.
const { User, AuditLog, Session } = require("../../models");

const { disconnectUser } = require("../../sockets");
const { ApiError } = require("../../utils/ApiError");
const { runTransaction } = require("../../utils/transaction");
const { pageView } = require("../../utils/pagination");

const {
   usersFilter,
   latestSubmissionIds,
   auditFilter,
   targetNames,
   userView,
   auditRow,
} = require("./helpers");

/* ---- the users page --------------------------------------------------- */

async function listUsers(req, res) {
   const query = req.valid.query;
   const filter = usersFilter(query);

   const [users, total] = await Promise.all([
      User.find(filter)
         .sort({ createdAt: -1, _id: -1 })
         .skip((query.page - 1) * query.limit)
         .limit(query.limit),
      User.countDocuments(filter),
   ]);

   const latest = await latestSubmissionIds(users);

   const rows = users.map((user) => ({
      ...userView(user),
      latestSubmissionId: latest.get(String(user._id)) || null,
   }));

   res.json(pageView("users", rows, total, query));
}

// Ban or lift a ban. Either one signs the account out everywhere.
async function updateUser(req, res) {
   const targetId = req.valid.params.id;
   const changes = req.valid.body;

   if (String(req.user._id) === targetId) {
      throw ApiError.badRequest("Use Settings for your own account");
   }

   const user = await runTransaction(async (session) => {
      const target = await User.findById(targetId).session(session);

      if (!target) throw ApiError.notFound("No such user");

      if (target.status === "DELETED")
         throw ApiError.badRequest("Deleted accounts cannot be changed");

      // Admins cannot ban admins, so no admin can lock another one out.
      if (target.role === "ADMIN")
         throw ApiError.forbidden("An admin cannot ban another admin");

      const before = { role: target.role, status: target.status };

      await User.updateOne(
         { _id: targetId },
         { $set: changes, $inc: { tokenVersion: 1 } },
         { session },
      );

      await Session.updateMany(
         { userId: targetId, status: { $ne: "REVOKED" } },
         { $set: { status: "REVOKED", revokedReason: "ADMIN" } },
         { session },
      );

      await AuditLog.create(
         [
            {
               actorId: req.user._id,
               action: "ADMIN_USER_UPDATED",
               targetType: "USER",
               targetId,
               meta: { before, changes },
               ip: req.ip,
            },
         ],
         { session },
      );

      return User.findById(targetId).session(session);
   });

   disconnectUser(user._id);

   res.json({ user: userView(user) });
}

// Every device signed out. The account itself is left as it is.
async function forceLogout(req, res) {
   const targetId = req.valid.params.id;

   if (String(req.user._id) === targetId) {
      throw ApiError.badRequest("Use Settings for your own account");
   }

   await runTransaction(async (session) => {
      const target = await User.findById(targetId).session(session);

      if (!target) throw ApiError.notFound("No such user");

      if (target.status === "DELETED")
         throw ApiError.badRequest("Deleted accounts cannot be changed");

      await User.updateOne(
         { _id: targetId },
         { $inc: { tokenVersion: 1 } },
         { session },
      );

      await Session.updateMany(
         { userId: targetId, status: { $ne: "REVOKED" } },
         { $set: { status: "REVOKED", revokedReason: "ADMIN" } },
         { session },
      );

      await AuditLog.create(
         [
            {
               actorId: req.user._id,
               action: "ADMIN_FORCE_LOGOUT",
               targetType: "USER",
               targetId,
               ip: req.ip,
            },
         ],
         { session },
      );
   });

   disconnectUser(targetId);

   res.json({ message: "Every device was signed out" });
}

/* ---- the audit log ---------------------------------------------------- */

async function listAudit(req, res) {
   const query = req.valid.query;
   const filter = auditFilter(query);

   const [rows, total, actions] = await Promise.all([
      AuditLog.find(filter)
         .sort({ createdAt: -1, _id: -1 })
         .skip((query.page - 1) * query.limit)
         .limit(query.limit)
         .populate("actorId", "username"),
      AuditLog.countDocuments(filter),
      AuditLog.distinct("action"),
   ]);

   const names = await targetNames(rows);

   res.json({
      ...pageView(
         "events",
         rows.map((row) => auditRow(row, names)),
         total,
         query,
      ),
      // Every action ever logged, for the filter.
      actions: actions.sort(),
   });
}

module.exports = { listUsers, updateUser, forceLogout, listAudit };
