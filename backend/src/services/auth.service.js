const bcrypt = require("bcrypt");

const { BCRYPT_ROUNDS } = require("../config/env");
const logger = require("../config/logger");
const { User, Session, AuthToken } = require("../models");
const { ApiError } = require("../utils/ApiError");
const { randomToken, hashToken } = require("../utils/tokens");
const { toMs } = require("../utils/duration");
const audit = require("./audit.service");
const mail = require("./mail.service");
const sessions = require("./session.service");
const { signAccessToken } = require("./token.service");

const VERIFY_TTL_MS = toMs("24h");
const RESET_TTL_MS = toMs("30m");

// Compared against when the email does not exist, so a wrong address and a
// wrong password take the same time to answer. Without it the reply time
// tells an attacker which addresses are registered.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

// Register and forgot-password say this whether or not the address is known.
const VAGUE_REPLY = {
   message: "If that address needs it, a link is on its way.",
};

const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);

// ---------------------------------------------------------------- email links

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

// An expired row is deleted by the TTL index within the minute, so an old
// link can read as invalid rather than expired. Both dead ends offer the
// same way forward, so the difference does not matter to the person.
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

async function sendVerificationLink(user, ip) {
   const raw = await issueLink({
      userId: user._id,
      type: "EMAIL_VERIFY",
      ttlMs: VERIFY_TTL_MS,
      ip,
   });

   await mail.sendVerificationEmail({ to: user.email, token: raw });
}

// ------------------------------------------------------------------- register

async function register({ username, email, password, ip }) {
   const taken = await User.exists({ username });

   // Usernames are public, so a clash is an ordinary field error. Addresses
   // are not, so a clash there stays quiet.
   if (taken) {
      throw ApiError.validation("Invalid input", [
         { field: "username", issue: "That username is taken" },
      ]);
   }

   const existing = await User.exists({ email });

   if (existing) {
      // Spend the same time as a real signup, then say the same thing.
      await hashPassword(password);
      logger.info({ ip }, "register attempt on an address that already exists");
      return VAGUE_REPLY;
   }

   let user;

   try {
      user = await User.create({
         username,
         email,
         passwordHash: await hashPassword(password),
      });
   } catch (err) {
      // Two signups racing for the same username or address. The unique index
      // is the real guard; the checks above only make the message nicer.
      if (err.code === 11000) return VAGUE_REPLY;
      throw err;
   }

   await sendVerificationLink(user, ip);

   return VAGUE_REPLY;
}

async function resendVerification({ email, ip }) {
   const user = await User.findOne({ email });

   if (user && user.status === "ACTIVE" && !user.emailVerified) {
      await sendVerificationLink(user, ip);
   }

   return VAGUE_REPLY;
}

async function verifyEmail({ token }) {
   const user = await consumeLink(token, "EMAIL_VERIFY");

   if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
   }

   return { status: "verified" };
}

// ---------------------------------------------------------------------- login

// Nothing slows a guesser down except bcrypt: there is no lockout and no rate
// limit yet. Every failed try is written to the audit log, so the pattern is
// at least visible. Rate limits arrive with Redis in phase 6.
async function login({ email, password, req }) {
   const user = await User.findOne({ email }).select("+passwordHash");

   // Always runs, even with no user, so the two cases take the same time.
   const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);

   if (!user || !ok) {
      await audit.record({
         actorId: user?._id,
         action: "LOGIN_FAILED",
         targetType: "USER",
         targetId: user?._id,
         ip: req.ip,
      });

      // The same message for a wrong address and a wrong password.
      throw new ApiError("INVALID_CREDENTIALS", "Email or password is wrong");
   }

   if (user.status === "BANNED")
      throw new ApiError("ACCOUNT_BANNED", "This account is banned");
   if (user.status === "DELETED")
      throw new ApiError("INVALID_CREDENTIALS", "Email or password is wrong");

   // The password was right, so this is an unfinished step rather than a
   // failure. No session is created until the address is confirmed.
   if (!user.emailVerified) {
      throw new ApiError(
         "EMAIL_NOT_VERIFIED",
         "Confirm your email address first",
      );
   }

   const { session, refreshToken } = await sessions.createSession(
      user._id,
      req,
   );

   await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

   return {
      accessToken: signAccessToken({ user, sessionId: session._id }),
      refreshToken,
      user,
   };
}

// -------------------------------------------------------------------- refresh

async function refresh({ token, req }) {
   if (!token) throw new ApiError("SESSION_INVALID", "No refresh token");

   const hash = hashToken(token);
   const current = await Session.findOne({ tokenHash: hash });

   if (!current) throw new ApiError("SESSION_INVALID", "Please sign in again");

   if (current.status === "REVOKED") {
      throw new ApiError(
         "SESSION_REVOKED",
         "This session was ended. Please sign in again.",
      );
   }

   let live = current;

   // A spent token came back. Either two tabs refreshed at the same moment,
   // or someone is replaying a stolen cookie. Only the first is forgiven.
   if (current.status === "ROTATED") {
      const grace = await sessions.findGraceSession(hash, req);

      if (!grace) {
         const result = await sessions.revokeFamily(
            current.familyId,
            "REUSE_DETECTED",
         );

         await audit.record({
            actorId: current.userId,
            action: "REFRESH_REUSE_DETECTED",
            targetType: "USER",
            targetId: current.userId,
            meta: {
               familyId: current.familyId,
               sessionsRevoked: result.modifiedCount,
            },
            ip: req.ip,
         });

         logger.warn(
            { familyId: current.familyId },
            "refresh token reuse, family revoked",
         );

         throw new ApiError(
            "SESSION_REVOKED",
            "For safety you were signed out everywhere. Please sign in again.",
         );
      }

      live = grace;
   }

   if (live.expiresAt < new Date()) {
      await sessions.revokeSession(live, "EXPIRED");
      throw new ApiError(
         "SESSION_EXPIRED",
         "Your session has expired. Please sign in again.",
      );
   }

   const user = await User.findById(live.userId);

   if (!user || user.status !== "ACTIVE") {
      await sessions.revokeFamily(live.familyId, "ADMIN");
      throw new ApiError(
         "SESSION_REVOKED",
         "This account can no longer sign in",
      );
   }

   const rotated = await sessions.rotateSession(live, req);

   return {
      accessToken: signAccessToken({ user, sessionId: rotated.session._id }),
      refreshToken: rotated.refreshToken,
      user,
   };
}

// --------------------------------------------------------------------- logout

// One family is one login on one device, so the whole family goes.
async function logout({ token }) {
   if (!token) return;

   const session = await Session.findOne({ tokenHash: hashToken(token) });

   if (session) await sessions.revokeFamily(session.familyId, "LOGOUT");
}

async function logoutAll(user) {
   await sessions.revokeAllForUser(user._id, "LOGOUT_ALL");

   // Kills every access token already handed out, including the one used to
   // make this call.
   await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
}

async function listSessions(user, currentSessionId) {
   const rows = await sessions.listActiveSessions(user._id);

   return rows.map((row) => ({
      id: row._id,
      device: { browser: row.device?.browser, os: row.device?.os },
      ip: row.ip,
      lastUsedAt: row.lastUsedAt,
      createdAt: row.createdAt,
      current: String(row._id) === String(currentSessionId),
   }));
}

async function revokeSessionById(user, sessionId) {
   const session = await Session.findOne({ _id: sessionId, userId: user._id });

   if (!session) throw ApiError.notFound("No such device");

   await sessions.revokeFamily(session.familyId, "LOGOUT");
}

// ------------------------------------------------------------------- password

async function forgotPassword({ email, ip }) {
   const user = await User.findOne({ email });

   if (user && user.status === "ACTIVE") {
      const raw = await issueLink({
         userId: user._id,
         type: "PASSWORD_RESET",
         ttlMs: RESET_TTL_MS,
         ip,
      });

      await mail.sendPasswordResetEmail({ to: user.email, token: raw });
   }

   return VAGUE_REPLY;
}

// Everything that changes a password does the same three things: store the
// new hash, end every session, and raise tokenVersion.
async function applyNewPassword(user, password, reason) {
   await User.updateOne(
      { _id: user._id },
      {
         passwordHash: await hashPassword(password),
         passwordUpdatedAt: new Date(),
         $inc: { tokenVersion: 1 },
      },
   );

   await sessions.revokeAllForUser(user._id, reason);
}

async function resetPassword({ token, password, req }) {
   const user = await consumeLink(token, "PASSWORD_RESET");

   await applyNewPassword(user, password, "PASSWORD_CHANGE");

   // Reaching the inbox proves the address, so a forgotten password also
   // finishes a signup that was never confirmed.
   if (!user.emailVerified)
      await User.updateOne({ _id: user._id }, { emailVerified: true });

   await audit.record({
      actorId: user._id,
      action: "PASSWORD_RESET",
      targetType: "USER",
      targetId: user._id,
      ip: req.ip,
   });

   return { message: "Password changed. Sign in with the new one." };
}

async function changePassword({ user, currentPassword, password, req }) {
   const withHash = await User.findById(user._id).select("+passwordHash");
   const ok = await bcrypt.compare(currentPassword, withHash.passwordHash);

   // A stolen access token is not enough on its own to lock someone out of
   // their own account.
   if (!ok)
      throw new ApiError(
         "INVALID_CREDENTIALS",
         "That is not your current password",
      );

   await applyNewPassword(withHash, password, "PASSWORD_CHANGE");

   await audit.record({
      actorId: user._id,
      action: "PASSWORD_CHANGED",
      targetType: "USER",
      targetId: user._id,
      ip: req.ip,
   });

   // Every other device is signed out; this one gets a fresh login so the
   // person is not thrown out of the page they are standing on.
   const fresh = await User.findById(user._id);
   const { session, refreshToken } = await sessions.createSession(
      fresh._id,
      req,
   );

   return {
      accessToken: signAccessToken({ user: fresh, sessionId: session._id }),
      refreshToken,
      user: fresh,
   };
}

module.exports = {
   register,
   resendVerification,
   verifyEmail,
   login,
   refresh,
   logout,
   logoutAll,
   listSessions,
   revokeSessionById,
   forgotPassword,
   resetPassword,
   changePassword,
};
