const { z } = require("zod");
const { isValidObjectId } = require("mongoose");

const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 72;

const password = z
   .string()
   .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
   .max(MAX_PASSWORD_LENGTH, `Use at most ${MAX_PASSWORD_LENGTH} characters`);

const email = z
   .email("That does not look like an email address")
   .toLowerCase()
   .trim();

const username = z
   .string()
   .trim()
   .toLowerCase()
   .min(3, "At least 3 characters")
   .max(20, "At most 20 characters")
   .regex(/^[a-z0-9_]+$/, "Letters, numbers and underscore only");

const registerSchema = z.object({ username, email, password });

const loginSchema = z.object({
   email,
   password: z.string().min(1, "Enter your password"),
});

const emailOnlySchema = z.object({ email });

const verifyQuerySchema = z.object({ token: z.string().min(1) });

const objectId = (message) =>
   z
      .string()
      .refine(
         (value) => value.length === 24 && isValidObjectId(value),
         message,
      );

const sessionIdSchema = z.object({ id: objectId("Not a session id") });

const resetPasswordSchema = z.object({ token: z.string().min(1), password });

const changePasswordSchema = z
   .object({
      currentPassword: z.string().min(1, "Enter your current password"),
      password,
   })
   .refine((value) => value.currentPassword !== value.password, {
      path: ["password"],
      message: "The new password has to be different",
   });

module.exports = {
   registerSchema,
   loginSchema,
   emailOnlySchema,
   verifyQuerySchema,
   sessionIdSchema,
   resetPasswordSchema,
   changePasswordSchema,
};
