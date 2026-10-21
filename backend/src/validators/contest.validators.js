const { z } = require("zod");
const { objectId, noDuplicates, dropEmpty, boolQuery } = require("./common");
const { isSlug } = require("../utils/slug");

const contestParamsSchema = z.object({ slug: z.string().min(1).max(140) });
const contestProblemSchema = contestParamsSchema.extend({
   problemSlug: z.string().min(1).max(140),
});

const idSchema = z.object({ id: objectId("Not a contest id") });
const listSchema = z.preprocess(
   dropEmpty,
   z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(20),
   }),
);

// The contests list: part of a title, and where the contest stands now.
const contestListSchema = z.preprocess(
   dropEmpty,
   z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(20),
      q: z.string().trim().max(80).optional(),
      state: z.enum(["LIVE", "UPCOMING", "ENDED", "DRAFT"]).optional(),
      // Only the contests the person asking has joined.
      joined: boolQuery,
   }),
);

const fields = {
   title: z.string().trim().min(3).max(120),
   slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(140)
      .refine(isSlug, "Use lowercase letters, numbers and single dashes"),
   description: z.string().trim().max(10000).default(""),
   startTime: z.iso
      .datetime({ offset: true })
      .transform((value) => new Date(value)),
   endTime: z.iso
      .datetime({ offset: true })
      .transform((value) => new Date(value)),
   penaltyPerWrongMin: z.coerce.number().int().min(0).max(120).default(10),
   problems: z
      .array(
         z.object({
            problemId: objectId("Not a problem id"),
            points: z.coerce.number().int().min(1).max(10000),
         }),
      )
      .min(1)
      .max(26)
      .refine(
         (rows) => noDuplicates(rows.map((row) => row.problemId)),
         "A problem may appear only once",
      ),
   isPublished: z.boolean().default(false),
};

// Editing sends the entire form, matching the problem editor.
const writeSchema = z
   .object(fields)
   .refine((body) => body.endTime > body.startTime, {
      path: ["endTime"],
      message: "End must be after start",
   });

module.exports = {
   contestListSchema,
   contestParamsSchema,
   contestProblemSchema,
   idSchema,
   listSchema,
   writeSchema,
};
