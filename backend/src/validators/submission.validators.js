const { z } = require("zod");

const { objectId } = require("./common");
const { LANGUAGES } = require("../utils/constants");

// Well under the 100kb body limit in app.js.
const MAX_SOURCE_CHARS = 64_000;

const createSubmissionSchema = z.object({
   problemId: objectId("Not a problem id"),
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

module.exports = { createSubmissionSchema, submissionIdSchema };
