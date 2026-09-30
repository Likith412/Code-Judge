// Writes the starter problems. Run twice and a slug already there is kept.
require("dotenv").config();

const { connectDatabase, disconnectDatabase } = require("../config/db");
const logger = require("../config/logger");
const { User, Problem, TestCase } = require("../models");
const { slugify } = require("../utils/slug");
const { runTransaction } = require("../utils/transaction");
const { seedUsers } = require("./users");
const problems = require("./problems");

const replace = process.argv.includes("--replace");

// Makes the dev accounts, then authors as the oldest admin, so re-seeding keeps owners.
async function findAuthor() {
   await seedUsers();

   const author =
      (await User.findOne({ role: "ADMIN" }).sort({ createdAt: 1 })) ||
      (await User.findOne({ role: "SETTER" }).sort({ createdAt: 1 }));

   if (!author)
      throw new Error("No admin or setter account to write problems as");

   return author;
}

async function writeProblem(spec, authorId) {
   const slug = slugify(spec.title);
   const existing = await Problem.findOne({ slug });

   if (existing && !replace) return "kept";

   const { testCases, ...fields } = spec;

   // One transaction, so --replace cannot drop a problem and fail to rewrite it.
   await runTransaction(async (session) => {
      // This only ever removes a problem whose slug is in ./problems.js.
      if (existing) {
         await TestCase.deleteMany({ problemId: existing._id }, { session });
         await existing.deleteOne({ session });
      }

      const [problem] = await Problem.create(
         [
            {
               ...fields,
               slug,
               createdBy: authorId,
               isPublished: true,
               testCaseCount: testCases.length,
            },
         ],
         { session },
      );

      await TestCase.insertMany(
         testCases.map((testCase, index) => ({
            ...testCase,
            problemId: problem._id,
            order: index + 1,
         })),
         { session },
      );
   });

   return existing ? "replaced" : "created";
}

async function seed() {
   await connectDatabase();

   const author = await findAuthor();

   logger.info(`Seeding as ${author.username}, role ${author.role}`);

   const counts = { created: 0, replaced: 0, kept: 0 };

   for (const spec of problems) {
      const action = await writeProblem(spec, author._id);

      counts[action] += 1;
      logger.info(`  ${action} ${slugify(spec.title)}`);
   }

   logger.info(
      `Done: ${counts.created} created, ${counts.replaced} replaced, ${counts.kept} left alone`,
   );

   if (counts.kept > 0) logger.info("Pass --replace to overwrite those.");
}

seed()
   .then(disconnectDatabase)
   .catch(async (err) => {
      logger.error(err.message);
      await disconnectDatabase();
      process.exit(1);
   });
