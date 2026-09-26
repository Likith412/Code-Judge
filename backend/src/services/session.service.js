const { randomBytes } = require("node:crypto");

const { REFRESH_TOKEN_TTL } = require("../config/env");
const { Session } = require("../models");
const { randomToken, hashToken } = require("../utils/tokens");
const { toMs } = require("../utils/duration");
const { parseUserAgent } = require("../utils/userAgent");

// Allow simultaneous refreshes from the same device to avoid false token-reuse detection.
const GRACE_WINDOW_MS = 10_000;

/* ---- helpers ------------------------------------------------------- */

const newFamilyId = () => `fam_${randomBytes(6).toString("hex")}`;

function clientInfo(req) {
   const userAgent = req.get("user-agent");

   return { ip: req.ip, userAgent, device: parseUserAgent(userAgent) };
}

/* ---- used by services/auth.service.js, never by a controller ------- */

async function createSession(userId, req) {
   const refreshToken = randomToken();

   const session = await Session.create({
      userId,
      familyId: newFamilyId(),
      tokenHash: hashToken(refreshToken),
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + toMs(REFRESH_TOKEN_TTL)),
      lastUsedAt: new Date(),
      ...clientInfo(req),
   });

   return { session, refreshToken };
}

// Replaces the current refresh token with a new one in the same login family.
async function rotateSession(current, req) {
   const refreshToken = randomToken();

   const session = await Session.create({
      userId: current.userId,
      familyId: current.familyId,
      tokenHash: hashToken(refreshToken),
      previousTokenHash: current.tokenHash,
      status: "ACTIVE",
      expiresAt: current.expiresAt,
      lastUsedAt: new Date(),
      ...clientInfo(req),
   });

   current.status = "ROTATED";
   await current.save();

   return { session, refreshToken };
}

// Allows a recently replaced token from the same device during the grace period.
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

// Revokes one login session.
const revokeSession = (session, reason) =>
   Session.updateOne(
      { _id: session._id },
      { status: "REVOKED", revokedReason: reason },
   );

// Revokes every session belonging to the same login family.
const revokeFamily = (familyId, reason) =>
   Session.updateMany(
      { familyId, status: { $ne: "REVOKED" } },
      { status: "REVOKED", revokedReason: reason },
   );

// Revokes all login sessions belonging to a user.
const revokeAllForUser = (userId, reason) =>
   Session.updateMany(
      { userId, status: { $ne: "REVOKED" } },
      { status: "REVOKED", revokedReason: reason },
   );

// Returns all active logins for a user, newest first.
const listActiveSessions = (userId) =>
   Session.find({ userId, status: "ACTIVE", expiresAt: { $gt: new Date() } })
      .sort({ lastUsedAt: -1 })
      .select("device ip lastUsedAt createdAt");

module.exports = {
   GRACE_WINDOW_MS,
   createSession,
   rotateSession,
   findGraceSession,
   revokeSession,
   revokeFamily,
   revokeAllForUser,
   listActiveSessions,
};
