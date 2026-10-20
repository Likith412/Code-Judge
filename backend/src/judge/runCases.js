// Every case in one box, to the fields a submission keeps.
const runner = require("./dockerRunner");
const { MESSAGE_LIMIT, cut, caseVerdict, sampleResult } = require("./verdict");

// Submit stops at the first failure. Run goes through every sample.
async function runCases(submission, problem, cases) {
   const limits = {
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
   };

   const stopEarly = !submission.isSampleRun;

   // The container is sized to this problem's memory limit.
   const { box, compileError } = await runner.prepare(
      submission.language,
      submission.sourceCode,
      limits,
   );

   try {
      if (compileError) {
         return {
            status: "COMPILATION_ERROR",
            testCasesPassed: 0,
            errorMessage: cut(compileError, MESSAGE_LIMIT),
         };
      }

      const fields = { status: "ACCEPTED", testCasesPassed: 0 };
      const samples = [];

      for (const [index, testCase] of cases.entries()) {
         const position = index + 1;
         const raw = await runner.runOne(box, testCase, limits);
         const verdict = caseVerdict(raw, testCase, problem.comparisonMode);

         if (submission.isSampleRun) {
            samples.push(sampleResult(position, testCase, raw, verdict));
         }

         if (verdict.status === "ACCEPTED") {
            fields.testCasesPassed += 1;
            continue;
         }

         // The first failure decides the verdict, later ones only add rows.
         if (fields.status === "ACCEPTED") {
            fields.status = verdict.status;
            fields.failedTestIndex = position;

            if (verdict.message)
               fields.errorMessage = cut(verdict.message, MESSAGE_LIMIT);

            if (stopEarly && !testCase.isHidden) {
               samples.push(sampleResult(position, testCase, raw, verdict));
            }
         }

         // A killed box cannot run the next sample either.
         if (stopEarly || raw.stop) break;
      }

      if (samples.length) fields.sampleResults = samples;

      return fields;
   } finally {
      await runner.cleanup(box);
   }
}

module.exports = { runCases };
