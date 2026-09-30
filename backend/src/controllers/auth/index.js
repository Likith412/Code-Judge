// One handler per /api/auth route. What they share is in ./helpers.
const bcrypt = require("bcrypt");

const logger = require("../../config/logger");
const {
   sendVerificationEmail,
   sendPasswordResetEmail,
} = require("../../config/mailer");
const { User, Session } = require("../../models");
const { ApiError } = require("../../utils/ApiError");
const { signAccessToken } = require("../../utils/accessToken");
const { hashToken } = require("../../utils/tokens");
const { runTransaction } = require("../../utils/transaction");
const {
   clearRefreshCookie,
   readRefreshCookie,
} = require("../../utils/cookies");

const {
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
   revokeOtherSessions,
   issueLink,
   consumeLink,
   hashPassword,
   applyNewPassword,
   usernameTaken,
} = require("./helpers");

/* ---- signing up and confirming the address ---------------------------- */

async function register(req, res) {
   const { username, email, password } = req.valid.body;
   const ip = req.ip;

   // A taken username is said out loud. A taken email is not.
   if (await User.exists({ username })) throw usernameTaken();

   if (await User.exists({ email })) {
      // Spend the same time as a real signup, then say the same thing.
      await hashPassword(password);
      logger.info({ ip }, "register attempt on an address that already exists");

      return res.status(201).json(VAGUE_REPLY);
   }

   const passwordHash = await hashPassword(password);

   // The account and its link land together, or neither is any use.
   const { user, raw } = await runTransaction(async (session) => {
      const [created] = await User.create([{ username, email, passwordHash }], {
         session,
      });

      return {
         user: created,
         raw: await issueLink(
            {
               userId: created._id,
               type: "EMAIL_VERIFY",
               ttlMs: VERIFY_TTL_MS,
               ip,
            },
            session,
         ),
      };
   });

   // After the commit, never inside: a retry would send it twice.
   await sendVerificationEmail({ to: user.email, token: raw });

   res.status(201).json(VAGUE_REPLY);
}

async function resendVerification(req, res) {
   const user = await User.findOne({ email: req.valid.body.email });

   if (user && user.status === "ACTIVE" && !user.emailVerified) {
      const raw = await issueLink({
         userId: user._id,
         type: "EMAIL_VERIFY",
         ttlMs: VERIFY_TTL_MS,
         ip: req.ip,
      });

      await sendVerificationEmail({ to: user.email, token: raw });
   }

   res.json(VAGUE_REPLY);
}

async function verify(req, res) {
   // One step, or a spent link can leave the address unconfirmed.
   await runTransaction(async (session) => {
      const user = await consumeLink(
         req.valid.query.token,
         "EMAIL_VERIFY",
         session,
      );

      if (!user.emailVerified) {
         await User.updateOne(
            { _id: user._id },
            { emailVerified: true },
            { session },
         );
      }
   });

   res.json({ status: "verified" });
}

/* ---- signing in ------------------------------------------------------- */

async function login(req, res) {
   const { email, password } = req.valid.body;

   const user = await User.findOne({ email }).select("+passwordHash");

   // Always runs, even with no user, so the two cases take the same time.
   const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);

   if (!user || !ok) {
      await recordAudit({
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

   // The password was right, so this is an unfinished step, not a failure.
   if (!user.emailVerified) {
      throw new ApiError(
         "EMAIL_NOT_VERIFIED",
         "Confirm your email address first",
      );
   }

   const { session, refreshToken } = await createSession(user._id, req);

   await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

   sendLogin(res, 200, {
      accessToken: signAccessToken({ user, sessionId: session._id }),
      refreshToken,
      user,
   });
}

/* ---- staying signed in ------------------------------------------------ */

async function refresh(req, res) {
   try {
      const token = readRefreshCookie(req);

      if (!token) throw new ApiError("SESSION_INVALID", "No refresh token");

      const hash = hashToken(token);
      const current = await Session.findOne({ tokenHash: hash });

      if (!current)
         throw new ApiError("SESSION_INVALID", "Please sign in again");

      if (current.status === "REVOKED") {
         throw new ApiError(
            "SESSION_REVOKED",
            "This session was ended. Please sign in again.",
         );
      }

      let live = current;

      // A spent token came back: two tabs racing, or a stolen cookie.
      if (current.status === "ROTATED") {
         const grace = await findGraceSession(hash, req);

         if (!grace) {
            const result = await revokeFamily(
               current.familyId,
               "REUSE_DETECTED",
            );

            await recordAudit({
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
         await revokeSessionRow(live, "EXPIRED");
         throw new ApiError(
            "SESSION_EXPIRED",
            "Your session has expired. Please sign in again.",
         );
      }

      const user = await User.findById(live.userId);

      if (!user || user.status !== "ACTIVE") {
         await revokeFamily(live.familyId, "ADMIN");
         throw new ApiError(
            "SESSION_REVOKED",
            "This account can no longer sign in",
         );
      }

      const rotated = await rotateSession(live, req);

      sendLogin(res, 200, {
         accessToken: signAccessToken({
            user,
            sessionId: rotated.session._id,
         }),
         refreshToken: rotated.refreshToken,
         user,
      });
   } catch (err) {
      // A cookie that no longer works should not be sent again.
      clearRefreshCookie(res);
      throw err;
   }
}

/* ---- signing out ------------------------------------------------------ */

// One family is one login on one device, so the whole family goes.
async function logout(req, res) {
   const token = readRefreshCookie(req);

   if (token) {
      const session = await Session.findOne({ tokenHash: hashToken(token) });

      if (session) await revokeFamily(session.familyId, "LOGOUT");
   }

   clearRefreshCookie(res);

   res.json({ message: "Signed out" });
}

async function logoutAll(req, res) {
   const current = await Session.findById(req.auth.sid).select("familyId");

   const { signedOutCount, fresh } = await runTransaction(async (session) => {
      const devices = await revokeOtherSessions(
         req.user._id,
         current?.familyId,
         "LOGOUT_ALL",
         session,
      );

      // Kills every access token already handed out, this one included.
      await User.updateOne(
         { _id: req.user._id },
         { $inc: { tokenVersion: 1 } },
         { session },
      );

      return {
         signedOutCount: devices,
         fresh: await User.findById(req.user._id).session(session),
      };
   });

   // This device keeps its session and cookie, and gets a matching token.
   res.json({
      accessToken: signAccessToken({ user: fresh, sessionId: req.auth.sid }),
      user: publicUser(fresh),
      signedOutCount,
   });
}

/* ---- the account ------------------------------------------------------ */

async function me(req, res) {
   res.json({ user: publicUser(req.user) });
}

// Three fields can change. The email cannot: it is the login name.
async function updateMe(req, res) {
   const { user } = req;
   const { username, displayName, bio } = req.valid.body;

   const changes = {};

   if (username !== undefined && username !== user.username) {
      if (await User.exists({ username, _id: { $ne: user._id } }))
         throw usernameTaken();

      changes.username = username;
   }

   if (displayName !== undefined) changes.displayName = displayName;
   if (bio !== undefined) changes.bio = bio;

   if (Object.keys(changes).length === 0) {
      return res.json({ user: publicUser(user) });
   }

   try {
      await User.updateOne({ _id: user._id }, changes);
   } catch (err) {
      // Two people claiming one name at once. The unique index catches it.
      if (err.code === 11000) throw usernameTaken();

      throw err;
   }

   res.json({ user: publicUser(await User.findById(user._id)) });
}

/* ---- devices ---------------------------------------------------------- */

async function listSessions(req, res) {
   const rows = await Session.find({
      userId: req.user._id,
      status: "ACTIVE",
      expiresAt: { $gt: new Date() },
   })
      .sort({ lastUsedAt: -1 })
      .select("device ip signedInAt lastUsedAt createdAt");

   res.json({
      sessions: rows.map((row) => ({
         id: row._id,
         device: { browser: row.device?.browser, os: row.device?.os },
         ip: row.ip,
         lastUsedAt: row.lastUsedAt,
         // Older rows have no signedInAt, so fall back to their own createdAt.
         signedInAt: row.signedInAt || row.createdAt,
         current: String(row._id) === String(req.auth.sid),
      })),
   });
}

async function revokeSession(req, res) {
   const session = await Session.findOne({
      _id: req.valid.params.id,
      userId: req.user._id,
   });

   if (!session) throw ApiError.notFound("No such device");

   await revokeFamily(session.familyId, "LOGOUT");

   res.json({ message: "That device was signed out" });
}

/* ---- passwords -------------------------------------------------------- */

async function forgotPassword(req, res) {
   const user = await User.findOne({ email: req.valid.body.email });

   if (user && user.status === "ACTIVE") {
      const raw = await issueLink({
         userId: user._id,
         type: "PASSWORD_RESET",
         ttlMs: RESET_TTL_MS,
         ip: req.ip,
      });

      await sendPasswordResetEmail({ to: user.email, token: raw });
   }

   res.json(VAGUE_REPLY);
}

async function resetPassword(req, res) {
   const { token, password } = req.valid.body;

   // All four together: half of it done is a hole or a locked out account.
   const user = await runTransaction(async (session) => {
      const found = await consumeLink(token, "PASSWORD_RESET", session);

      await applyNewPassword(found, password, "PASSWORD_CHANGE", session);

      // Reaching the inbox proves the email, so it counts as confirming it.
      if (!found.emailVerified) {
         await User.updateOne(
            { _id: found._id },
            { emailVerified: true },
            { session },
         );
      }

      return found;
   });

   await recordAudit({
      actorId: user._id,
      action: "PASSWORD_RESET",
      targetType: "USER",
      targetId: user._id,
      ip: req.ip,
   });

   res.json({ message: "Password changed. Sign in with the new one." });
}

async function changePassword(req, res) {
   const { currentPassword, password } = req.valid.body;

   const withHash = await User.findById(req.user._id).select("+passwordHash");
   const ok = await bcrypt.compare(currentPassword, withHash.passwordHash);

   // A stolen token alone must not be enough to take an account over.
   if (!ok)
      throw new ApiError(
         "INVALID_CREDENTIALS",
         "That is not your current password",
      );

   await applyNewPassword(withHash, password, "PASSWORD_CHANGE");

   await recordAudit({
      actorId: req.user._id,
      action: "PASSWORD_CHANGED",
      targetType: "USER",
      targetId: req.user._id,
      ip: req.ip,
   });

   // Other devices are out. This one gets a fresh login so it stays usable.
   const fresh = await User.findById(req.user._id);
   const { session, refreshToken } = await createSession(fresh._id, req);

   sendLogin(res, 200, {
      accessToken: signAccessToken({ user: fresh, sessionId: session._id }),
      refreshToken,
      user: fresh,
   });
}

module.exports = {
   register,
   resendVerification,
   verify,
   login,
   refresh,
   logout,
   logoutAll,
   me,
   updateMe,
   listSessions,
   revokeSession,
   forgotPassword,
   resetPassword,
   changePassword,
};
