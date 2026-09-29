const { z } = require("zod");
const { isValidObjectId } = require("mongoose");

// A mongo id as it arrives in a url: 24 hex characters.
const objectId = (message) =>
   z
      .string()
      .refine((value) => value.length === 24 && isValidObjectId(value), message);

// Query strings only ever carry text, so "true" is the only yes.
const boolQuery = z
   .enum(["true", "false"])
   .optional()
   .transform((value) => value === "true");

const noDuplicates = (list) => new Set(list).size === list.length;

module.exports = { objectId, boolQuery, noDuplicates };
