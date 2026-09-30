const { z } = require("zod");

// No default means required: the server must not start half configured.
const schema = z.object({
   NODE_ENV: z.enum(["development", "production"]).default("development"),
   PORT: z.coerce.number().default(3000),
   LOG_LEVEL: z.string().default("info"),
   MONGO_URI: z.string().min(1),
   ALLOWED_ORIGINS: z.string().min(1),
   WEB_URL: z.url(),

   JWT_SECRET: z.string().min(32, "must be at least 32 characters"),
   JWT_ISSUER: z.string().min(1),
   JWT_AUDIENCE: z.string().min(1),
   ACCESS_TOKEN_TTL: z.string().min(1),
   REFRESH_TOKEN_TTL: z.string().min(1),

   BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15),

   // The only one allowed to be empty: on localhost the cookie has no domain.
   COOKIE_DOMAIN: z.string().default(""),

   SMTP_URL: z.string().min(1),
   MAIL_FROM: z.string().min(1),

   // Only the seed reads this, and it refuses to run in production.
   SEED_PASSWORD: z.string().min(10).default("codejudge-dev-pass"),
});

const result = schema.safeParse(process.env);

if (!result.success) {
   for (const issue of result.error.issues) {
      console.error(`env ${issue.path.join(".")}: ${issue.message}`);
   }
   console.error("Copy .env.example to .env and fill it in.");
   process.exit(1);
}

module.exports = {
   ...result.data,
   ALLOWED_ORIGINS: result.data.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
};
