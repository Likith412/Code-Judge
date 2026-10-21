// Test-case work for the problem handlers. Nothing here touches res: it returns a value.
const { Problem, TestCase } = require("../../models");

const { ApiError } = require("../../utils/ApiError");
const { runTransaction } = require("../../utils/transaction");
const {
   loadEditableProblem,
   assertContestEditable,
   isDuplicateKey,
} = require("./helpers");

/* ---- shaping the response --------------------------------------------- */

const fullCase = (row) => ({
   id: row._id,
   order: row.order,
   input: row.input,
   expectedOutput: row.expectedOutput,
   isHidden: row.isHidden,
   explanation: row.explanation,
   weight: row.weight,
   createdAt: row.createdAt,
   updatedAt: row.updatedAt,
});

/* ---- bookkeeping ------------------------------------------------------ */

// Copy the real count onto the problem, so the list page needs no join.
async function syncTestCaseCount(problemId, session) {
   const count = await TestCase.countDocuments({ problemId }, { session });

   await Problem.updateOne(
      { _id: problemId },
      { $set: { testCaseCount: count } },
      { session },
   );

   return count;
}

async function nextOrder(problemId, session) {
   const last = await TestCase.findOne({ problemId })
      .session(session)
      .sort({ order: -1 })
      .select("order");

   return last ? last.order + 1 : 1;
}

/* ---- what a published problem must keep ------------------------------- */

async function assertCaseRemains(problem, session) {
   if (!problem.isPublished) return;

   const total = await TestCase.countDocuments(
      { problemId: problem._id },
      { session },
   );

   if (total <= 1) {
      throw ApiError.badRequest(
         "A published problem needs at least one test case",
      );
   }
}

async function assertSampleRemains(problem, testCase, session) {
   if (!problem.isPublished || testCase.isHidden) return;

   const samples = await TestCase.countDocuments(
      { problemId: problem._id, isHidden: false },
      { session },
   );

   if (samples <= 1) {
      throw ApiError.badRequest(
         "A published problem needs at least one sample case",
      );
   }
}

/* ---- adding, editing, removing ---------------------------------------- */

async function insertTestCase(problemId, fields) {
   // Two adds at once can pick the same order; retried outside, as a clash aborts the transaction.
   for (let attempt = 1; attempt <= 25; attempt += 1) {
      try {
         return await runTransaction(async (session) => {
            await assertContestEditable(problemId, session);

            const [testCase] = await TestCase.create(
               [
                  {
                     ...fields,
                     problemId,
                     order: await nextOrder(problemId, session),
                  },
               ],
               { session },
            );

            return {
               testCase,
               testCaseCount: await syncTestCaseCount(problemId, session),
            };
         });
      } catch (err) {
         if (!isDuplicateKey(err)) throw err;
      }
   }

   throw ApiError.conflict("Could not pick a run order, please try again");
}

async function saveTestCase(params, user, fields) {
   return runTransaction(async (session) => {
      const problem = await loadEditableProblem(params.id, user, session);

      const testCase = await TestCase.findOne({
         _id: params.testCaseId,
         problemId: problem._id,
      }).session(session);

      if (!testCase) throw ApiError.notFound("No such test case");

      if (fields.isHidden === true) {
         await assertSampleRemains(problem, testCase, session);
      }

      testCase.set(fields);

      await testCase.save({ session });

      // Touch the problem so a publish at the same moment conflicts with this.
      await Problem.updateOne(
         { _id: problem._id },
         { $set: { updatedAt: new Date() } },
         { session },
      );

      return testCase;
   });
}

async function loadOwnTestCase(params, user) {
   const problem = await loadEditableProblem(params.id, user);

   const testCase = await TestCase.findOne({
      _id: params.testCaseId,
      problemId: problem._id,
   });

   if (!testCase) throw ApiError.notFound("No such test case");

   return { problem, testCase };
}

async function removeTestCase(problem, testCase) {
   return runTransaction(async (session) => {
      await assertContestEditable(problem._id, session);
      await assertCaseRemains(problem, session);
      await assertSampleRemains(problem, testCase, session);

      await testCase.deleteOne({ session });

      return syncTestCaseCount(problem._id, session);
   });
}

module.exports = {
   fullCase,
   insertTestCase,
   saveTestCase,
   loadOwnTestCase,
   removeTestCase,
};
