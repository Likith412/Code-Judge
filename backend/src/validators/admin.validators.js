const { z } = require("zod");
const { objectId, dropEmpty } = require("./common");

const paging = {
   page: z.coerce.number().int().min(1).default(1),
   limit: z.coerce.number().int().min(1).max(50).default(20),
};

const listUsersSchema = z.preprocess(
   dropEmpty,
   z.object({
      ...paging,
      q: z.string().trim().max(80).optional(),
      role: z.enum(["USER", "SETTER", "ADMIN"]).optional(),
      status: z.enum(["ACTIVE", "BANNED", "DELETED"]).optional(),
   }),
);

const auditSchema = z.preprocess(
   dropEmpty,
   z.object({
      ...paging,
      action: z.string().trim().max(80).optional(),
      actorId: objectId("Not a user id").optional(),
   }),
);

const userIdSchema = z.object({ id: objectId("Not a user id") });

// Roles are fixed once an account exists. An admin can only ban or lift a ban.
const updateUserSchema = z.strictObject({
   status: z.enum(["ACTIVE", "BANNED"]),
});

module.exports = {
   listUsersSchema,
   auditSchema,
   userIdSchema,
   updateUserSchema,
};
