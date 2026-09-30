const { z } = require("zod");
const { isValidObjectId } = require("mongoose");

// A mongo id as it arrives in a url: 24 hex characters.
const objectId = (message) =>
   z
      .string()
      .refine(
         (value) => value.length === 24 && isValidObjectId(value),
         message,
      );

// Drop empty fields so optional/default values work and clearing a search box is allowed.
const dropEmpty = (value) => {
   if (value === null || typeof value !== "object") return value;

   const kept = {};

   for (const [key, item] of Object.entries(value)) {
      if (typeof item === "string" && item.trim() === "") continue;

      kept[key] = item;
   }

   return kept;
};

// A query string only carries text, so take 1 and 0 as well as true and false.
const boolQuery = z
   .enum(["true", "false", "1", "0"])
   .optional()
   .transform((value) => value === "true" || value === "1");

const noDuplicates = (list) => new Set(list).size === list.length;

module.exports = { objectId, dropEmpty, boolQuery, noDuplicates };
