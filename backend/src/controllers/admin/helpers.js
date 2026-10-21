// Shared by the admin handlers. Nothing here touches res: it returns a value.
const { User, Problem, Contest, Submission } = require("../../models");

const { containsText } = require("../../utils/search");

/* ---- the users page --------------------------------------------------- */

// Search is any part of the username or email, ignoring case.
function usersFilter(query) {
   const filter = {};

   if (query.role) filter.role = query.role;
   if (query.status) filter.status = query.status;

   if (query.q) {
      const match = containsText(query.q);

      filter.$or = [{ username: match }, { email: match }];
   }

   return filter;
}

// Each user's newest Submit on this page, in one query, for the row link.
async function latestSubmissionIds(users) {
   const rows = await Submission.aggregate([
      {
         $match: {
            userId: { $in: users.map((user) => user._id) },
            isSampleRun: false,
         },
      },
      { $sort: { createdAt: -1, _id: -1 } },
      { $group: { _id: "$userId", id: { $first: "$_id" } } },
   ]);

   return new Map(rows.map((row) => [String(row._id), row.id]));
}

/* ---- the audit log ---------------------------------------------------- */

function auditFilter(query) {
   const filter = {};

   if (query.action) filter.action = query.action;
   if (query.actorId) filter.actorId = query.actorId;

   return filter;
}

// A readable name for each target on the page: a username or a title.
async function targetNames(rows) {
   const ids = (type) =>
      rows.filter((row) => row.targetType === type).map((row) => row.targetId);

   const [users, problems, contests] = await Promise.all([
      User.find({ _id: { $in: ids("USER") } }).select("username"),
      Problem.find({ _id: { $in: ids("PROBLEM") } }).select("title"),
      Contest.find({ _id: { $in: ids("CONTEST") } }).select("title"),
   ]);

   return new Map([
      ...users.map((row) => [String(row._id), `@${row.username}`]),
      ...problems.map((row) => [String(row._id), row.title]),
      ...contests.map((row) => [String(row._id), row.title]),
   ]);
}

/* ---- shaping the response --------------------------------------------- */

// What an admin sees of an account. Never the password hash or tokenVersion.
const userView = (user) => ({
   id: user._id,
   username: user.username,
   email: user.email,
   role: user.role,
   status: user.status,
   emailVerified: user.emailVerified,
   createdAt: user.createdAt,
});

// A deleted target has no name left, so targetName is null for it.
const auditRow = (row, names) => ({
   id: row._id,
   action: row.action,
   actor: row.actorId
      ? { id: row.actorId._id, username: row.actorId.username }
      : null,
   targetType: row.targetType,
   targetId: row.targetId,
   targetName: names.get(String(row.targetId)) || null,
   meta: row.meta,
   ip: row.ip,
   createdAt: row.createdAt,
});

module.exports = {
   usersFilter,
   latestSubmissionIds,
   auditFilter,
   targetNames,
   userView,
   auditRow,
};
