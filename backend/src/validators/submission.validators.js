const { z } = require("zod");

const { objectId, dropEmpty } = require("./common");
const { LANGUAGES, SUBMISSION_STATUSES } = require("../utils/constants");

// Well under the 100kb body limit in app.js.
const MAX_SOURCE_CHARS = 64_000;

const createSubmissionSchema = z.object({
   problemId: objectId("Not a problem id"),
   contestId: objectId("Not a contest id").optional(),
   language: z.enum(LANGUAGES),
   sourceCode: z
      .string()
      .refine((code) => code.trim().length > 0, "Write some code first")
      .refine(
         (code) => code.length <= MAX_SOURCE_CHARS,
         `At most ${MAX_SOURCE_CHARS} characters`,
      ),
   // Run sends true, Submit leaves it out.
   isSampleRun: z.boolean().default(false),
});

const submissionIdSchema = z.object({ id: objectId("Not a submission id") });

// My submissions: paged, and narrowed by problem, language or verdict.
const listMineQuerySchema = z.preprocess(
   dropEmpty,
   z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(20),
      problemId: objectId("Not a problem id").optional(),
      // Only the ones made inside this contest.
      contestId: objectId("Not a contest id").optional(),
      language: z.enum(LANGUAGES).optional(),
      status: z.enum(SUBMISSION_STATUSES).optional(),
   }),
);

module.exports = {
   createSubmissionSchema,
   submissionIdSchema,
   listMineQuerySchema,
};
