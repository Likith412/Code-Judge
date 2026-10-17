// What each status is called on screen.
const STATUS_LABEL = {
   QUEUED: "Queued",
   RUNNING: "Running",
   ACCEPTED: "Accepted",
   WRONG_ANSWER: "Wrong answer",
   TIME_LIMIT_EXCEEDED: "Time limit exceeded",
   MEMORY_LIMIT_EXCEEDED: "Memory limit exceeded",
   COMPILATION_ERROR: "Compilation error",
   RUNTIME_ERROR: "Runtime error",
   SYSTEM_ERROR: "System error",
};

const isPending = (status) => status === "QUEUED" || status === "RUNNING";

// The tag colour: grey while waiting, ink for accepted, red for the rest.
const statusTone = (status) => {
   if (isPending(status)) return "pending";
   if (status === "ACCEPTED") return "accepted";
   if (status === "SYSTEM_ERROR") return "system";
   return "failed";
};

// What goes under a failed verdict, one line or two. problem gives the limits.
function failedText(submission, problem) {
   const { status, failedTestIndex: at, totalTestCases: total } = submission;
   const sample = submission.sampleResults?.[0];

   switch (status) {
      case "WRONG_ANSWER":
         return [
            `Failed on test ${at} of ${total}` +
               (sample
                  ? " - a sample case, shown below."
                  : " - a hidden case, so its input isn’t shown."),
         ];
      case "TIME_LIMIT_EXCEEDED":
         return [
            `Test ${at} of ${total} ran past the ${problem.timeLimitMs ? `${problem.timeLimitMs} ms` : "time"} limit.`,
            "The limit is per test case, on the slowest one.",
         ];
      case "MEMORY_LIMIT_EXCEEDED":
         return [
            `Test ${at} of ${total} used more than the ${problem.memoryLimitMb ? `${problem.memoryLimitMb} MB` : "memory"} limit.`,
         ];
      case "RUNTIME_ERROR":
         return [`Crashed on test ${at} of ${total}.`];
      case "COMPILATION_ERROR":
         return ["Did not compile, so no tests ran."];
      default:
         return [];
   }
}

export { STATUS_LABEL, isPending, statusTone, failedText };
