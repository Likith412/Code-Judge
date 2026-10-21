// Contest scoring, shared by the contest helpers. Nothing here touches res.

// Rebuilt from submission times; finishedAt, if set, closes the window early.
function scoreParticipant(contest, submissions, finishedAt = null) {
   const solved = [];
   let score = 0;
   let penaltyMinutes = 0;
   const end =
      finishedAt && new Date(finishedAt) < new Date(contest.endTime)
         ? new Date(finishedAt)
         : new Date(contest.endTime);

   const ordered = [...submissions].sort(
      (a, b) =>
         new Date(a.createdAt) - new Date(b.createdAt) ||
         String(a._id).localeCompare(String(b._id)),
   );

   for (const problem of contest.problems) {
      let wrongAttempts = 0;

      for (const row of ordered) {
         const time = new Date(row.createdAt);

         if (
            String(row.problemId) !== String(problem.problemId) ||
            row.isSampleRun ||
            time < new Date(contest.startTime) ||
            time >= end
         )
            continue;

         if (["QUEUED", "RUNNING", "SYSTEM_ERROR"].includes(row.status))
            continue;

         if (row.status !== "ACCEPTED") {
            wrongAttempts += 1;
            continue;
         }

         const solvedAtMin = Math.floor(
            (time - new Date(contest.startTime)) / 60000,
         );
         solved.push({
            problemId: problem.problemId,
            solvedAtMin,
            wrongAttempts,
            points: problem.points,
         });
         score += problem.points;
         penaltyMinutes +=
            solvedAtMin + wrongAttempts * contest.penaltyPerWrongMin;
         break;
      }
   }

   return { score, penaltyMinutes, solved };
}

module.exports = { scoreParticipant };
