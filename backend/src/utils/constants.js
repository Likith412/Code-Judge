// Lists used by both the schemas and the validators, so they cannot drift.
const LANGUAGES = ["java", "python", "cpp"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
const COMPARISON_MODES = ["EXACT", "TRIM"];

// Words the problem routes use themselves, so no slug may take one.
const RESERVED_SLUGS = ["tags"];

module.exports = {
   LANGUAGES,
   DIFFICULTIES,
   COMPARISON_MODES,
   RESERVED_SLUGS,
};
