// One handler per /api/contests route. What they share is in ./helpers.
const {
   Contest,
   ContestParticipant,
   Problem,
   AuditLog,
} = require("../../models");

const { ApiError } = require("../../utils/ApiError");
const { runTransaction } = require("../../utils/transaction");
const { pageView } = require("../../utils/pagination");
const { problemDetail, loadSamples } = require("../problems/helpers");

const {
   contestState,
   loadContest,
   findParticipant,
   loadContestProblem,
   assertProblemsOpen,
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
} = require("./helpers");

/* ---- reading ---------------------------------------------------------- */

async function listContests(req, res) {
   const query = req.valid.query;
   const filter = await contestListFilter(query, req.user);

   const [rows, total] = await Promise.all([
      Contest.find(filter)
         .sort({ startTime: -1, _id: -1 })
         .skip((query.page - 1) * query.limit)
         .limit(query.limit),
      Contest.countDocuments(filter),
   ]);

   const scores = await joinedScores(req.user, rows);

   res.json({
      ...pageView(
         "contests",
         rows.map((row) => listedContest(row, scores)),
         total,
         query,
      ),
      serverTime: new Date(),
   });
}

async function getContest(req, res) {
   const contest = await loadContest(req.valid.params.slug, req.user);
   const participant = await findParticipant(contest._id, req.user);

   // Questions are listed only while live, and never to someone who ended early.
   const canRead =
      req.user?.role === "ADMIN" ||
      (contestState(contest) === "LIVE" && !participant?.finishedAt);

   res.json({
      contest: {
         ...contestCard(contest),
         joined: Boolean(participant),
         finishedAt: participant?.finishedAt || null,
         problems: canRead
            ? await contestProblemRows(contest, participant)
            : [],
      },
      // The browser counts down from this, so a wrong local clock does not matter.
      serverTime: new Date(),
   });
}

async function getProblem(req, res) {
   const contest = await loadContest(req.valid.params.slug, req.user);
   const participant = await findParticipant(contest._id, req.user);

   // Before the slug lookup, so every slug gets the same answer before the start.
   assertProblemsOpen(contest, req.user, participant);

   const found = await Problem.findOne({
      slug: req.valid.params.problemSlug,
   }).select("_id");

   if (!found) throw ApiError.notFound("No such problem");

   const problem = await loadContestProblem(contest, found._id);

   const samples = await loadSamples(problem._id);

   res.json({
      problem: {
         ...problemDetail(
            problem,
            samples,
            solvedInContest(participant, problem._id),
         ),
         contestId: contest._id,
         contestSlug: contest.slug,
         contestTitle: contest.title,
         contestState: contestState(contest),
         contestJoined: Boolean(participant),
         contestStartTime: contest.startTime,
         contestEndTime: contest.endTime,
      },
      serverTime: new Date(),
   });
}

async function rankings(req, res) {
   const contest = await loadContest(req.valid.params.slug, req.user);
   const query = req.valid.query;
   const filter = await standingsFilter(contest._id);

   const [rows, total] = await Promise.all([
      ContestParticipant.find(filter)
         .sort({ score: -1, penaltyMinutes: 1, joinedAt: 1, _id: 1 })
         .skip((query.page - 1) * query.limit)
         .limit(query.limit)
         .populate("userId", "username status"),
      ContestParticipant.countDocuments(filter),
   ]);

   const ranked = await Promise.all(
      rows.map((row) => rankingRow(contest, row, filter)),
   );

   res.json(pageView("rankings", ranked, total, query));
}

/* ---- taking part ------------------------------------------------------ */

async function joinContest(req, res) {
   const contest = await loadContest(req.valid.params.slug, req.user);

   try {
      await runTransaction(async (session) => {
         const open = await Contest.exists({
            _id: contest._id,
            isPublished: true,
            endTime: { $gt: new Date() },
         }).session(session);

         if (!open) {
            throw ApiError.badRequest(
               "This contest is not open for registration",
            );
         }

         // Joining twice is fine: the second time does nothing.
         if (await findParticipant(contest._id, req.user, session)) return;

         await ContestParticipant.create(
            [{ contestId: contest._id, userId: req.user._id }],
            { session },
         );

         await Contest.updateOne(
            { _id: contest._id },
            { $inc: { participantCount: 1 } },
            { session },
         );
      });
   } catch (error) {
      // Two Joins at the same moment: the unique index stops the second one.
      if (error.code !== 11000) throw error;
   }

   res.json({ message: "You joined the contest" });
}

// The participant ends the contest for themselves. Their score so far stays.
async function finishContest(req, res) {
   const contest = await loadContest(req.valid.params.slug, req.user);

   if (!contest.isPublished || contestState(contest) !== "LIVE") {
      throw ApiError.badRequest("You can end a contest only while it is live");
   }

   const participant = await findParticipant(contest._id, req.user);

   if (!participant) throw ApiError.forbidden("Join the contest first");

   // Only the first press counts, so the time never moves later.
   await ContestParticipant.updateOne(
      { _id: participant._id, finishedAt: null },
      { $set: { finishedAt: new Date() } },
   );

   const fresh = await ContestParticipant.findById(participant._id).select(
      "finishedAt",
   );

   res.json({ finishedAt: fresh.finishedAt });
}

/* ---- writing, admins only --------------------------------------------- */

// POST creates a draft, PATCH /:id edits one. Publishing fixes it for good.
async function saveContest(req, res) {
   const body = req.valid.body;
   const editingId = req.valid.params?.id;
   let contest;

   try {
      contest = await runTransaction(async (session) => {
         const existing = await loadEditableContest(editingId, session);

         if (body.startTime <= new Date()) {
            throw ApiError.badRequest("Start time must be in the future");
         }

         await assertContestProblems(body, existing?._id, session);

         const saved = await writeContest(
            existing,
            contestFields(body),
            req.user,
            session,
         );

         await AuditLog.create(
            [
               {
                  actorId: req.user._id,
                  action: body.isPublished
                     ? "CONTEST_PUBLISHED"
                     : "CONTEST_SAVED",
                  targetType: "CONTEST",
                  targetId: saved._id,
                  ip: req.ip,
               },
            ],
            { session },
         );

         return saved;
      });
   } catch (error) {
      if (error.code === 11000) {
         throw ApiError.conflict(
            "That slug or a selected problem is already used by a contest",
         );
      }

      throw error;
   }

   res.status(editingId ? 200 : 201).json({ contest: contestCard(contest) });
}

module.exports = {
   listContests,
   getContest,
   getProblem,
   rankings,
   joinContest,
   finishContest,
   saveContest,
};
