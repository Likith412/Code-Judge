// Shared by the contest handlers and the judge. Nothing here touches res: it returns a value.
const {
   Contest,
   ContestParticipant,
   Problem,
   Submission,
   User,
} = require("../../models");

const { ApiError } = require("../../utils/ApiError");
const { containsText } = require("../../utils/search");
const { assertPublishable } = require("../problems/helpers");
const { scoreParticipant } = require("./scoring");

/* ---- the contest and who is in it ------------------------------------- */

const contestState = (contest, now = new Date()) =>
   now < contest.startTime
      ? "UPCOMING"
      : now >= contest.endTime
        ? "ENDED"
        : "LIVE";

// A draft looks missing to everyone but an admin.
async function loadContest(slug, user) {
   const contest = await Contest.findOne({ slug });

   if (!contest || (!contest.isPublished && user?.role !== "ADMIN")) {
      throw ApiError.notFound("No such contest");
   }

   return contest;
}

const findParticipant = (contestId, user, session = null) =>
   user
      ? ContestParticipant.findOne({ contestId, userId: user._id }).session(
           session,
        )
      : null;

/* ---- reading and submitting a contest problem ------------------------- */

async function loadContestProblem(contest, problemId) {
   const inContest = contest.problems.some(
      (row) => String(row.problemId) === String(problemId),
   );

   if (!inContest) throw ApiError.notFound("No such contest problem");

   const problem = await Problem.findById(problemId);

   if (!problem) throw ApiError.notFound("No such problem");

   return problem;
}

// Questions are open only while live, and not to someone who ended early.
function assertProblemsOpen(contest, user, participant) {
   if (user?.role === "ADMIN") return;

   const state = contestState(contest);

   // Before the start it stays a 404, so no slug leaks.
   if (!contest.isPublished || state === "UPCOMING") {
      throw ApiError.notFound("Contest problems open at the start time");
   }

   if (state === "ENDED") {
      throw new ApiError(
         "CONTEST_CLOSED",
         "This contest has ended. Its questions are closed.",
      );
   }

   if (participant?.finishedAt) {
      throw new ApiError(
         "CONTEST_FINISHED",
         "You ended this contest. Its problems are closed for you.",
      );
   }
}

function assertCanSubmit(contest, participant, now) {
   if (!contest.isPublished || contestState(contest, now) !== "LIVE") {
      throw ApiError.badRequest(
         "Submissions are open only while the contest is live",
      );
   }

   if (!participant) {
      throw ApiError.forbidden("Join the contest before submitting");
   }

   if (participant.finishedAt) {
      throw new ApiError(
         "CONTEST_FINISHED",
         "You ended this contest, so you can no longer submit.",
      );
   }
}

/* ---- the contests list ------------------------------------------------ */

// Drafts are admins' only. Live, upcoming and ended are published contests.
async function contestListFilter(query, user) {
   const admin = user?.role === "ADMIN";
   const filter = admin ? {} : { isPublished: true };
   const now = new Date();

   if (query.q) filter.title = containsText(query.q);

   if (query.state === "DRAFT") {
      if (!admin) filter._id = null;

      filter.isPublished = false;
   } else if (query.state) {
      filter.isPublished = true;

      if (query.state === "LIVE") {
         filter.startTime = { $lte: now };
         filter.endTime = { $gt: now };
      }

      if (query.state === "UPCOMING") filter.startTime = { $gt: now };
      if (query.state === "ENDED") filter.endTime = { $lte: now };
   }

   // Only a USER joins, so only a USER has joined contests to filter by.
   if (query.joined) {
      const ids =
         user?.role === "USER"
            ? await ContestParticipant.distinct("contestId", {
                 userId: user._id,
              })
            : [];

      filter._id = filter._id === null ? null : { $in: ids };
   }

   return filter;
}

async function joinedScores(user, contests) {
   if (user?.role !== "USER") return null;

   const rows = await ContestParticipant.find({
      userId: user._id,
      contestId: { $in: contests.map((contest) => contest._id) },
   }).select("contestId score");

   return new Map(rows.map((row) => [String(row.contestId), row.score]));
}

/* ---- shaping the response --------------------------------------------- */

const contestCard = (contest) => ({
   id: contest._id,
   title: contest.title,
   slug: contest.slug,
   description: contest.description,
   startTime: contest.startTime,
   endTime: contest.endTime,
   state: contestState(contest),
   isPublished: contest.isPublished,
   participantCount: contest.participantCount,
   penaltyPerWrongMin: contest.penaltyPerWrongMin,
});

const listedContest = (contest, scores) => ({
   ...contestCard(contest),
   ...(scores && {
      joined: scores.has(String(contest._id)),
      myScore: scores.get(String(contest._id)) ?? null,
   }),
});

// The contest's questions in order. Solved is per contest, for a participant.
async function contestProblemRows(contest, participant) {
   const problems = await Problem.find({
      _id: { $in: contest.problems.map((row) => row.problemId) },
   }).select("title slug difficulty");

   const byId = new Map(problems.map((row) => [String(row._id), row]));

   const solvedIds = participant
      ? new Set(participant.solved.map((item) => String(item.problemId)))
      : null;

   return contest.problems.map((row) => {
      const problem = byId.get(String(row.problemId));

      return {
         problemId: row.problemId,
         label: row.label,
         points: row.points,
         title: problem?.title || "Missing problem",
         slug: problem?.slug,
         difficulty: problem?.difficulty,
         ...(solvedIds && { solved: solvedIds.has(String(row.problemId)) }),
      };
   });
}

// Solved in this contest, so an old practice accept does not count.
const solvedInContest = (participant, problemId) =>
   participant
      ? participant.solved.some(
           (item) => String(item.problemId) === String(problemId),
        )
      : null;

/* ---- rankings --------------------------------------------------------- */

// Banned accounts are left out, so they take no place in the standings.
async function standingsFilter(contestId) {
   const banned = await User.distinct("_id", { status: "BANNED" });

   return { contestId, userId: { $nin: banned } };
}

// Equal score and penalty share a rank, including across page boundaries.
async function rankOf(filter, row) {
   const ahead = await ContestParticipant.countDocuments({
      ...filter,
      $or: [
         { score: { $gt: row.score } },
         { score: row.score, penaltyMinutes: { $lt: row.penaltyMinutes } },
      ],
   });

   return ahead + 1;
}

async function rankingRow(contest, row, filter) {
   const labelOf = (problemId) =>
      contest.problems.find(
         (problem) => String(problem.problemId) === String(problemId),
      )?.label;

   return {
      rank: await rankOf(filter, row),
      username: row.userId?.status === "ACTIVE" ? row.userId.username : null,
      score: row.score,
      penaltyMinutes: row.penaltyMinutes,
      solved: row.solved.map((item) => ({
         label: labelOf(item.problemId),
         solvedAtMin: item.solvedAtMin,
         wrongAttempts: item.wrongAttempts,
         points: item.points,
      })),
   };
}

/* ---- saving a contest ------------------------------------------------- */

// Existing drafts only, each in no other contest, and ready if publishing.
async function assertContestProblems(body, exceptId, session) {
   const ids = body.problems.map((row) => row.problemId);
   const problems = await Problem.find({ _id: { $in: ids } }).session(session);

   if (
      problems.length !== ids.length ||
      problems.some((problem) => problem.isPublished)
   ) {
      throw ApiError.badRequest(
         "Choose existing draft problems for the contest",
      );
   }

   const conflict = await Contest.exists({
      ...(exceptId ? { _id: { $ne: exceptId } } : {}),
      "problems.problemId": { $in: ids },
   }).session(session);

   if (conflict) {
      throw ApiError.conflict("A problem already belongs to another contest");
   }

   if (body.isPublished) {
      for (const problem of problems) await assertPublishable(problem, session);
   }

   // Touch the rows so concurrent publishing or deletion conflicts with this write.
   await Problem.updateMany(
      { _id: { $in: ids } },
      { $set: { updatedAt: new Date() } },
      { session },
   );
}

async function loadEditableContest(id, session) {
   if (!id) return null;

   const existing = await Contest.findById(id).session(session);

   if (!existing) throw ApiError.notFound("No such contest");

   if (existing.isPublished) {
      throw ApiError.badRequest(
         "Published contests are fixed; create a new draft instead",
      );
   }

   return existing;
}

// Questions are lettered A, B, C... in the order they were chosen.
const contestFields = (body) => ({
   ...body,
   problems: body.problems.map((row, index) => ({
      ...row,
      label: String.fromCharCode(65 + index),
   })),
});

async function writeContest(existing, fields, user, session) {
   if (!existing) {
      const [created] = await Contest.create(
         [{ ...fields, createdBy: user._id }],
         { session },
      );

      return created;
   }

   await Contest.updateOne(
      { _id: existing._id },
      { $set: fields },
      { session },
   );

   return Contest.findById(existing._id).session(session);
}

/* ---- scoring, called by the judge ------------------------------------- */

// Rebuilds the participant's score from all their Submits in this contest.
async function updateContestScore(submission, session) {
   if (!submission.contestId || submission.isSampleRun) return;

   const contest = await Contest.findById(submission.contestId).session(
      session,
   );

   if (!contest) return;

   // One after the other: a transaction cannot run two queries at once.
   const rows = await Submission.find({
      contestId: contest._id,
      userId: submission.userId,
      isSampleRun: false,
   })
      .select("problemId status createdAt")
      .session(session);

   const participant = await findParticipant(
      contest._id,
      { _id: submission.userId },
      session,
   );

   await ContestParticipant.updateOne(
      { contestId: contest._id, userId: submission.userId },
      { $set: scoreParticipant(contest, rows, participant?.finishedAt) },
      { session },
   );
}

module.exports = {
   contestState,
   loadContest,
   findParticipant,
   loadContestProblem,
   assertProblemsOpen,
   assertCanSubmit,
   contestListFilter,
   joinedScores,
   contestCard,
   listedContest,
   contestProblemRows,
   solvedInContest,
   standingsFilter,
   rankingRow,
   assertContestProblems,
   loadEditableContest,
   contestFields,
   writeContest,
   updateContestScore,
};
