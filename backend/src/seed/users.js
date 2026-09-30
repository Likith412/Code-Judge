// The two dev accounts. Known password, so this never runs in production.
require("dotenv").config();

const bcrypt = require("bcrypt");

const { NODE_ENV, BCRYPT_ROUNDS, SEED_PASSWORD } = require("../config/env");
const { connectDatabase, disconnectDatabase } = require("../config/db");
const logger = require("../config/logger");
const { User } = require("../models");

// .test can never be a real domain, so no mail can leave by accident.
const ACCOUNTS = [
   { username: "admin", email: "admin@codejudge.test", role: "ADMIN" },
   { username: "setter", email: "setter@codejudge.test", role: "SETTER" },
];

// Already verified, because login refuses an account that is not.
async function createAccount(account, passwordHash) {
   const existing = await User.findOne({
      $or: [{ username: account.username }, { email: account.email }],
   });

   if (existing) return { user: existing, created: false };

   const user = await User.create({
      ...account,
      emailVerified: true,
      passwordHash,
      passwordUpdatedAt: new Date(),
   });

   return { user, created: true };
}

// Makes both accounts if they are missing. Safe to call on every seed run.
async function seedUsers() {
   if (NODE_ENV === "production") {
      throw new Error(
         "Refusing to make accounts with a known password in production",
      );
   }

   const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS);
   const accounts = {};
   let createdAny = false;

   for (const account of ACCOUNTS) {
      const { user, created } = await createAccount(account, passwordHash);

      accounts[user.role] = user;
      createdAny = createdAny || created;
      logger.info(
         `  ${created ? "created" : "kept"} ${user.role} ${user.email}`,
      );
   }

   if (createdAny) logger.info(`  password for both: ${SEED_PASSWORD}`);

   return accounts;
}

module.exports = { seedUsers, ACCOUNTS, SEED_PASSWORD };

// Runnable on its own: npm run seed:users
if (require.main === module) {
   connectDatabase()
      .then(seedUsers)
      .then(disconnectDatabase)
      .catch(async (err) => {
         logger.error(err.message);
         await disconnectDatabase();
         process.exit(1);
      });
}
