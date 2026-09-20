const { z } = require("zod");

// No default means required: the server must not start half configured.
const schema = z.object({
   NODE_ENV: z.enum(["development", "production"]).default("development"),
   PORT: z.coerce.number().default(3000),
   LOG_LEVEL: z.string().default("info"),
   MONGO_URI: z.string().min(1),
   ALLOWED_ORIGINS: z.string().min(1),
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
