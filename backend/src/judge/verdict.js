// One case's raw result to a verdict. No Docker, no database.
const { outputMatches } = require("./compare");

// Long enough for a stack trace, short enough for a document.
const MESSAGE_LIMIT = 8 * 1024;
const SAMPLE_OUTPUT_LIMIT = 4 * 1024;

const cut = (text, limit) =>
   text.length > limit
      ? `${text.slice(0, limit)}\n… cut at ${limit} characters`
      : text;

// stderr could print a hidden test's input, so hidden crashes show only a name.
function crashMessage(raw, testCase) {
   if (!testCase.isHidden) return raw.stderr || `Exited with code ${raw.code}`;

   const what = raw.crashName || `Exited with code ${raw.code}`;

   return `${what}\n\nThe full error is not shown for a hidden test.`;
}

function caseVerdict(raw, testCase, comparisonMode) {
   if (raw.timedOut) return { status: "TIME_LIMIT_EXCEEDED" };
   if (raw.outOfMemory) return { status: "MEMORY_LIMIT_EXCEEDED" };

   if (raw.overflow) {
      return {
         status: "RUNTIME_ERROR",
         message: `Printed more than ${Math.round(raw.outputLimit / 1024)} KB, so it was stopped.`,
      };
   }

   if (raw.code !== 0) {
      return { status: "RUNTIME_ERROR", message: crashMessage(raw, testCase) };
   }

   const passed = outputMatches(
      raw.stdout,
      testCase.expectedOutput,
      comparisonMode,
   );

   return { status: passed ? "ACCEPTED" : "WRONG_ANSWER" };
}

// A sample is public, so what it was fed and what came out can be shown.
const sampleResult = (position, testCase, raw, verdict) => ({
   position,
   status: verdict.status,
   input: testCase.input,
   expectedOutput: testCase.expectedOutput,
   actualOutput: cut(raw.stdout, SAMPLE_OUTPUT_LIMIT),
});

module.exports = { MESSAGE_LIMIT, cut, caseVerdict, sampleResult };
