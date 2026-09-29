const { z } = require("zod");

const { objectId, boolQuery, noDuplicates } = require("./common");
const { isSlug } = require("../utils/slug");
const {
   LANGUAGES,
   DIFFICULTIES,
   COMPARISON_MODES,
} = require("../utils/constants");

// Test case text is capped well under the 100kb body limit in app.js.
const MAX_CASE_CHARS = 20_000;

/* ---- the pieces a problem is made of --------------------------------- */

const title = z
   .string()
   .trim()
   .min(3, "At least 3 characters")
   .max(120, "At most 120 characters");

const slug = z
   .string()
   .trim()
   .toLowerCase()
   .max(140, "At most 140 characters")
   .refine(isSlug, "Lowercase letters, numbers and single dashes only");

const description = z
   .string()
   .trim()
   .min(20, "At least 20 characters")
   .max(20_000, "At most 20000 characters");

const difficulty = z.enum(DIFFICULTIES);

const constraints = z
   .array(z.string().trim().min(1).max(200, "At most 200 characters"))
   .max(20, "At most 20 lines");

const examples = z
   .array(
      z.object({
         input: z.string().max(2_000, "At most 2000 characters"),
         output: z.string().max(2_000, "At most 2000 characters"),
         explanation: z.string().trim().max(500).optional(),
      }),
   )
   .max(5, "At most 5 examples");

const starterCode = z.object({
   java: z.string().max(10_000).optional(),
   python: z.string().max(10_000).optional(),
   cpp: z.string().max(10_000).optional(),
});

const supportedLanguages = z
   .array(z.enum(LANGUAGES))
   .min(1, "Pick at least one language")
   .refine(noDuplicates, "The same language twice");

const tags = z
   .array(z.string().trim().toLowerCase().min(1).max(30))
   .max(10, "At most 10 tags")
   .refine(noDuplicates, "The same tag twice");

const timeLimitMs = z.coerce
   .number()
   .int()
   .min(100, "At least 100ms")
   .max(15_000, "At most 15000ms");

const memoryLimitMb = z.coerce
   .number()
   .int()
   .min(16, "At least 16mb")
   .max(1_024, "At most 1024mb");

/* ---- reading ---------------------------------------------------------- */

const listProblemsQuerySchema = z.object({
   page: z.coerce.number().int().min(1).default(1),
   limit: z.coerce.number().int().min(1).max(50).default(20),

   difficulty: difficulty.optional(),

   // One tag or several: ?tags=array,hash-table
   tags: z
      .string()
      .trim()
      .transform((value) =>
         value
            .split(",")
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean),
      )
      .optional(),

   q: z.string().trim().min(2, "At least 2 characters").max(60).optional(),

   // Only a setter or admin may ask for anything but PUBLISHED.
   status: z.enum(["PUBLISHED", "DRAFT", "ALL"]).default("PUBLISHED"),
   mine: boolQuery,

   sort: z.enum(["NEWEST", "OLDEST", "TITLE", "DIFFICULTY"]).default("NEWEST"),
});

const problemSlugSchema = z.object({ slug });
const problemIdSchema = z.object({ id: objectId("Not a problem id") });

const testCaseParamsSchema = z.object({
   id: objectId("Not a problem id"),
   testCaseId: objectId("Not a test case id"),
});

/* ---- writing a problem ------------------------------------------------ */

// A new problem is always a draft. Publishing happens through PATCH, which
// checks there is at least one test case first.
const createProblemSchema = z.object({
   title,
   slug: slug.optional(),
   description,
   difficulty,
   supportedLanguages,

   constraints: constraints.optional(),
   examples: examples.optional(),
   starterCode: starterCode.optional(),
   tags: tags.optional(),
   timeLimitMs: timeLimitMs.optional(),
   memoryLimitMb: memoryLimitMb.optional(),
   comparisonMode: z.enum(COMPARISON_MODES).optional(),
});

const updateProblemSchema = z
   .object({
      title: title.optional(),
      slug: slug.optional(),
      description: description.optional(),
      difficulty: difficulty.optional(),
      supportedLanguages: supportedLanguages.optional(),

      constraints: constraints.optional(),
      examples: examples.optional(),
      starterCode: starterCode.optional(),
      tags: tags.optional(),
      timeLimitMs: timeLimitMs.optional(),
      memoryLimitMb: memoryLimitMb.optional(),
      comparisonMode: z.enum(COMPARISON_MODES).optional(),
      isPublished: z.boolean().optional(),
   })
   .refine((value) => Object.keys(value).length > 0, "Nothing to change");

/* ---- writing a test case --------------------------------------------- */

// An empty input is fine, a program need not read stdin. An empty expected
// output almost always means the case was filled in wrong.
const createTestCaseSchema = z.object({
   input: z.string().max(MAX_CASE_CHARS, "The input is too big"),
   expectedOutput: z
      .string()
      .min(1, "Enter what the program should print")
      .max(MAX_CASE_CHARS, "The output is too big"),

   isHidden: z.boolean().optional(),
   explanation: z.string().trim().max(500).optional(),
   weight: z.coerce.number().min(0).max(100).optional(),
   order: z.coerce.number().int().min(1).optional(),
});

const updateTestCaseSchema = z
   .object({
      input: z.string().max(MAX_CASE_CHARS, "The input is too big").optional(),
      expectedOutput: z
         .string()
         .min(1, "Enter what the program should print")
         .max(MAX_CASE_CHARS, "The output is too big")
         .optional(),
      isHidden: z.boolean().optional(),
      explanation: z.string().trim().max(500).optional(),
      weight: z.coerce.number().min(0).max(100).optional(),
      order: z.coerce.number().int().min(1).optional(),
   })
   .refine((value) => Object.keys(value).length > 0, "Nothing to change");

module.exports = {
   listProblemsQuerySchema,
   problemSlugSchema,
   problemIdSchema,
   testCaseParamsSchema,
   createProblemSchema,
   updateProblemSchema,
   createTestCaseSchema,
   updateTestCaseSchema,
};
