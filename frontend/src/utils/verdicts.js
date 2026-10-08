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

export { STATUS_LABEL, isPending, statusTone };
