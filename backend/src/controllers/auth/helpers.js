// Shared by the auth handlers. Nothing here touches res: it returns a value.
const bcrypt = require("bcrypt");
const { randomBytes } = require("node:crypto");

const { User, Session, AuthToken } = require("../../models");

const { BCRYPT_ROUNDS, REFRESH_TOKEN_TTL } = require("../../config/env");
const { ApiError } = require("../../utils/ApiError");
const { randomToken, hashToken } = require("../../utils/tokens");
const { recordAudit } = require("../../utils/audit");
const { runTransaction } = require("../../utils/transaction");
const { toMs } = require("../../utils/duration");
const { parseUserAgent } = require("../../utils/userAgent");
const { setRefreshCookie } = require("../../utils/cookies");

// Hashed once at start-up; used when the email is unknown, so both wrong answers take the same time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

// One shared reply, so register and forgot-password can never drift apart and reveal an account.
const VAGUE_REPLY = {
   message: "If that address needs it, a link is on its way.",
};

/* ---- shaping the response -------------------------------------------- */

// The only user fields the browser ever sees. Listed one by one on purpose.
const publicUser = (user) => ({
   id: user._id,
   username: user.username,
   displayName: user.displayName,
   email: user.email,
   emailVerified: user.emailVerified,
   role: user.role,
   avatarUrl: user.avatarUrl,
   bio: user.bio,
   stats: user.stats,
   createdAt: user.createdAt,
});

// Token in the body for memory, refresh token in a cookie the page cannot read.
const sendLogin = (res, status, { accessToken, refreshToken, user }) => {
   setRefreshCookie(res, refreshToken);

   res.status(status).json({ accessToken, user: publicUser(user) });
};

/* ---- sessions --------------------------------------------------------- */

const newFamilyId = () => `fam_${randomBytes(6).toString("hex")}`;

function clientInfo(req) {
   const userAgent = req.get("user-agent");

   return { ip: req.ip, userAgent, device: parseUserAgent(userAgent) };
}

async function createSession(userId, req) {
   const refreshToken = randomToken();

   const session = await Session.create({
      userId,
      familyId: newFamilyId(),
      tokenHash: hashToken(refreshToken),
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + toMs(REFRESH_TOKEN_TTL)),
      signedInAt: new Date(),
      lastUsedAt: new Date(),
      ...clientInfo(req),
   });

   return { session, refreshToken };
}

// Spends the old row and adds a new one. The expiry is copied, not extended.
async function rotateSession(current, req) {
   const refreshToken = randomToken();

   // Rotate the old token and create the new one atomically to prevent two live tokens.
   const session = await runTransaction(async (active) => {
      const [created] = await Session.create(
         [
            {
               userId: current.userId,
               familyId: current.familyId,
               tokenHash: hashToken(refreshToken),
               previousTokenHash: current.tokenHash,
               status: "ACTIVE",
               expiresAt: current.expiresAt,
               // The login did not restart, it was only refreshed.
               signedInAt: current.signedInAt,
               lastUsedAt: new Date(),
               ...clientInfo(req),
            },
         ],
         { session: active },
      );

      await Session.updateOne(
         { _id: current._id },
         { status: "ROTATED" },
         { session: active },
      );

      return created;
   });

   return { session, refreshToken };
}

// The row that replaced a spent token, if it was just now and same device.
async function findGraceSession(spentHash, req) {
   const session = await Session.findOne({
      previousTokenHash: spentHash,
      status: "ACTIVE",
   });

   if (!session) return null;

   // Two tabs can refresh at once, so a just-spent token is allowed for 10 seconds.
   const fresh = Date.now() - session.createdAt.getTime() < 10_000;
   const sameDevice =
      session.ip === req.ip && session.userAgent === req.get("user-agent");

   return fresh && sameDevice ? session : null;
}

const revokeSessionRow = (session, reason) =>
   Session.updateOne(
      { _id: session._id },
      { status: "REVOKED", revokedReason: reason },
   );

// Every row of one login: logout, or a stolen token coming back.
const revokeFamily = (familyId, reason) =>
   Session.updateMany(
      { familyId, status: { $ne: "REVOKED" } },
      { status: "REVOKED", revokedReason: reason },
   );

// Every login of one person: password change and reset.
const revokeAllForUser = (userId, reason, session) =>
   Session.updateMany(
      { userId, status: { $ne: "REVOKED" } },
      { status: "REVOKED", revokedReason: reason },
      { session },
   );

// Every login but the one asking. Counts families, since rotated rows are not devices.
async function revokeOtherSessions(userId, keepFamilyId, reason, session) {
   const filter = { userId, status: { $ne: "REVOKED" } };

   if (keepFamilyId) filter.familyId = { $ne: keepFamilyId };

   const families = await Session.distinct(
      "familyId",
      { ...filter, status: "ACTIVE" },
      { session },
   );

   await Session.updateMany(
      filter,
      { status: "REVOKED", revokedReason: reason },
      { session },
   );

   return families.length;
}

/* ---- email links ------------------------------------------------------ */

// Only the newest link works: asking for a second one kills the first.
async function issueLink({ userId, type, ttlMs, ip }, session) {
   const raw = randomToken();

   // Replace the old link atomically so a failure cannot leave the user without a working link.
   const write = async (active) => {
      await AuthToken.deleteMany(
         { userId, type, usedAt: null },
         { session: active },
      );

      await AuthToken.create(
         [
            {
               userId,
               type,
               tokenHash: hashToken(raw),
               requestIp: ip,
               expiresAt: new Date(Date.now() + ttlMs),
            },
         ],
         { session: active },
      );
   };

   // Joins the caller's transaction when there is one, else runs in its own.
   await (session ? write(session) : runTransaction(write));

   return raw;
}

// An expired link may already be deleted, so missing and expired look alike.
async function consumeLink(raw, type, session) {
   const token = await AuthToken.findOne({
      tokenHash: hashToken(raw),
      type,
   }).session(session);

   if (!token) throw new ApiError("LINK_INVALID", "This link is not valid");

   if (token.usedAt)
      throw new ApiError("LINK_USED", "This link has already been used");

   if (token.expiresAt < new Date())
      throw new ApiError("LINK_EXPIRED", "This link has expired");

   const user = await User.findById(token.userId).session(session);

   if (!user || user.status === "DELETED")
      throw new ApiError("LINK_INVALID", "This link is not valid");

   // updateOne, not save(), so a retried transaction writes it again.
   await AuthToken.updateOne(
      { _id: token._id },
      { usedAt: new Date() },
      { session },
   );

   return user;
}

/* ---- passwords -------------------------------------------------------- */

const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);

// A new hash is not a password change until every old session is dead too.
async function applyNewPassword(user, password, reason, session) {
   // Hash before the transaction so retries do not repeat the slow bcrypt work.
   const passwordHash = await hashPassword(password);

   const write = async (active) => {
      await User.updateOne(
         { _id: user._id },
         {
            passwordHash,
            passwordUpdatedAt: new Date(),
            $inc: { tokenVersion: 1 },
         },
         { session: active },
      );

      await revokeAllForUser(user._id, reason, active);
   };

   await (session ? write(session) : runTransaction(write));
}

// Usernames are public, so a clash is a plain field error.
const usernameTaken = () =>
   ApiError.validation("Invalid input", [
      { field: "username", issue: "That username is taken" },
   ]);

module.exports = {
   DUMMY_HASH,
   VAGUE_REPLY,

   publicUser,
   sendLogin,
   recordAudit,

   createSession,
   rotateSession,
   findGraceSession,
   revokeSessionRow,
   revokeFamily,
   revokeAllForUser,
   revokeOtherSessions,

   issueLink,
   consumeLink,

   hashPassword,
   applyNewPassword,
   usernameTaken,
};
