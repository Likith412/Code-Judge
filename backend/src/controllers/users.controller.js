const { Problem, User } = require("../models");
const { ApiError } = require("../utils/ApiError");

// A public page, so never the email, role or anything about the account.
async function getProfile(req, res) {
   const user = await User.findOne({
      username: req.valid.params.username,
      status: "ACTIVE",
   });

   if (!user) throw ApiError.notFound("No such user");

   // A problem taken down after it was solved still counts, but is not listed.
   const solved = await Problem.find({
      _id: { $in: user.solvedProblemIds },
      isPublished: true,
   })
      .select("title slug difficulty")
      .sort({ difficultyRank: 1, title: 1 });

   const { stats } = user;

   res.json({
      user: {
         username: user.username,
         displayName: user.displayName || "",
         avatarUrl: user.avatarUrl || "",
         bio: user.bio || "",
         createdAt: user.createdAt,
         stats: {
            solvedTotal: stats.solvedTotal,
            solvedEasy: stats.solvedEasy,
            solvedMedium: stats.solvedMedium,
            solvedHard: stats.solvedHard,
            totalSubmissions: stats.totalSubmissions,
            acceptedSubmissions: stats.acceptedSubmissions,
            languageCounts: Object.fromEntries(stats.languageCounts || []),
         },
         solvedProblems: solved.map((problem) => ({
            title: problem.title,
            slug: problem.slug,
            difficulty: problem.difficulty,
         })),
      },
   });
}

module.exports = { getProfile };
