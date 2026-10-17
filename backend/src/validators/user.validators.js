const { z } = require("zod");

// Loose on purpose: anything that is not a real username is just a 404.
const usernameParamSchema = z.object({
   username: z.string().trim().toLowerCase().min(1).max(20),
});

module.exports = { usernameParamSchema };
