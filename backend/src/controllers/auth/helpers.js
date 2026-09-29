// Shared by the auth handlers. Nothing here touches res: it returns a value.
const bcrypt = require("bcrypt");
const { randomBytes } = require("node:crypto");

const { BCRYPT_ROUNDS, REFRESH_TOKEN_TTL } = require("../../config/env");
const logger = require("../../config/logger");
const { User, Session, AuthToken, AuditLog } = require("../../models");
const { ApiError } = require("../../utils/ApiError");
const { randomToken, hashToken } = require("../../utils/tokens");
const { toMs } = require("../../utils/duration");
const { parseUserAgent } = require("../../utils/userAgent");
const { setRefreshCookie } = require("../../utils/cookies");

const VERIFY_TTL_MS = toMs("24h");
const RESET_TTL_MS = toMs("30m");

// Two tabs can refresh at once, so a just-spent token is allowed this long.
const GRACE_WINDOW_MS = 10_000;

// Used when the email is unknown, so both wrong answers take the same time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

// Register and forgot-password say this whether or not the address is known.
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

/* ---- audit ------------------------------------------------------------ */

// Writing the log must never be the reason a request fails.
async function recordAudit(entry) {
   try {
      await AuditLog.create(entry);
   } catch (err) {
      logger.error({ err, action: entry.action }, "could not write audit log");
   }
}

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

   const session = await Session.create({
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
   });

   current.status = "ROTATED";
   await current.save();

   return { session, refreshToken };
}

// The row that replaced a spent token, if it was just now and same device.
async function findGraceSession(spentHash, req) {
   const session = await Session.findOne({
      previousTokenHash: spentHash,
      status: "ACTIVE",
   });

   if (!session) return null;

   const fresh = Date.now() - session.createdAt.getTime() < GRACE_WINDOW_MS;
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

// Every login of one person: logout-all, password change.
const revokeAllForUser = (userId, reason) =>
   Session.updateMany(
      { userId, status: { $ne: "REVOKED" } },
      { status: "REVOKED", revokedReason: reason },
   );

/* ---- email links ------------------------------------------------------ */

// Only the newest link works: asking for a second one kills the first.
async function issueLink({ userId, type, ttlMs, ip }) {
   const raw = randomToken();

   await AuthToken.deleteMany({ userId, type, usedAt: null });
   await AuthToken.create({
      userId,
      type,
      tokenHash: hashToken(raw),
      requestIp: ip,
      expiresAt: new Date(Date.now() + ttlMs),
   });

   return raw;
}

// An expired link may already be deleted, so missing and expired look alike.
async function consumeLink(raw, type) {
   const token = await AuthToken.findOne({ tokenHash: hashToken(raw), type });

   if (!token) throw new ApiError("LINK_INVALID", "This link is not valid");
   if (token.usedAt)
      throw new ApiError("LINK_USED", "This link has already been used");
   if (token.expiresAt < new Date())
      throw new ApiError("LINK_EXPIRED", "This link has expired");

   const user = await User.findById(token.userId);

   if (!user || user.status === "DELETED")
      throw new ApiError("LINK_INVALID", "This link is not valid");

   token.usedAt = new Date();
   await token.save();

   return user;
}

/* ---- passwords -------------------------------------------------------- */

const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);

// A new hash is not a password change until every old session is dead too.
async function applyNewPassword(user, password, reason) {
   await User.updateOne(
      { _id: user._id },
      {
         passwordHash: await hashPassword(password),
         passwordUpdatedAt: new Date(),
         $inc: { tokenVersion: 1 },
      },
   );

   await revokeAllForUser(user._id, reason);
}

// Usernames are public, so a clash is a plain field error.
const usernameTaken = () =>
   ApiError.validation("Invalid input", [
      { field: "username", issue: "That username is taken" },
   ]);

module.exports = {
   VERIFY_TTL_MS,
   RESET_TTL_MS,
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

   issueLink,
   consumeLink,

   hashPassword,
   applyNewPassword,
   usernameTaken,
};
