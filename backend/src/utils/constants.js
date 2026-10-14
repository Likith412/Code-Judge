// Lists used by both the schemas and the validators, so they cannot drift.
const LANGUAGES = ["java", "python", "cpp"];
// The ones the worker has an image for. Python and C++ come in phase 8.
const JUDGED_LANGUAGES = ["java"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
const COMPARISON_MODES = ["EXACT", "TRIM"];

// A submission waits, runs, then lands on exactly one verdict.
const PENDING_STATUSES = ["QUEUED", "RUNNING"];
const VERDICTS = [
   "ACCEPTED",
   "WRONG_ANSWER",
   "TIME_LIMIT_EXCEEDED",
   "MEMORY_LIMIT_EXCEEDED",
   "COMPILATION_ERROR",
   "RUNTIME_ERROR",
   "SYSTEM_ERROR",
];
const SUBMISSION_STATUSES = [...PENDING_STATUSES, ...VERDICTS];

// Words the problem routes use themselves, so no slug may take one.
const RESERVED_SLUGS = ["tags"];

module.exports = {
   LANGUAGES,
   JUDGED_LANGUAGES,
   DIFFICULTIES,
   COMPARISON_MODES,
   PENDING_STATUSES,
   VERDICTS,
   SUBMISSION_STATUSES,
   RESERVED_SLUGS,
};
