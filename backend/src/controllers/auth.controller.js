const auth = require("../services/auth.service");
const {
   setRefreshCookie,
   clearRefreshCookie,
   readRefreshCookie,
} = require("../utils/cookies");

/* ---- helpers, not route handlers ----------------------------------- */

// Explicitly allow only safe user fields to be sent to the browser.
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

// Login, refresh, and password change return the access token and set the refresh token as an HttpOnly cookie.
const sendLogin = (res, status, { accessToken, refreshToken, user }) => {
   setRefreshCookie(res, refreshToken);
   res.status(status).json({ accessToken, user: publicUser(user) });
};

/* ---- route handlers, mounted in routes/auth.routes.js -------------- */

const register = async (req, res) => {
   const result = await auth.register({ ...req.valid.body, ip: req.ip });

   res.status(201).json(result);
};

const resendVerification = async (req, res) => {
   res.json(await auth.resendVerification({ ...req.valid.body, ip: req.ip }));
};

const verify = async (req, res) => {
   res.json(await auth.verifyEmail(req.valid.query));
};

const login = async (req, res) => {
   sendLogin(res, 200, await auth.login({ ...req.valid.body, req }));
};

const refresh = async (req, res) => {
   try {
      sendLogin(
         res,
         200,
         await auth.refresh({ token: readRefreshCookie(req), req }),
      );
   } catch (err) {
      // A cookie that no longer works should not be sent again.
      clearRefreshCookie(res);
      throw err;
   }
};

const logout = async (req, res) => {
   await auth.logout({ token: readRefreshCookie(req) });
   clearRefreshCookie(res);

   res.json({ message: "Signed out" });
};

const logoutAll = async (req, res) => {
   await auth.logoutAll(req.user);
   clearRefreshCookie(res);

   res.json({ message: "Signed out on every device" });
};

const me = async (req, res) => {
   res.json({ user: publicUser(req.user) });
};

const listSessions = async (req, res) => {
   res.json({ sessions: await auth.listSessions(req.user, req.auth.sid) });
};

const revokeSession = async (req, res) => {
   await auth.revokeSessionById(req.user, req.valid.params.id);

   res.json({ message: "That device was signed out" });
};

const forgotPassword = async (req, res) => {
   res.json(await auth.forgotPassword({ ...req.valid.body, ip: req.ip }));
};

const resetPassword = async (req, res) => {
   res.json(await auth.resetPassword({ ...req.valid.body, req }));
};

const changePassword = async (req, res) => {
   sendLogin(
      res,
      200,
      await auth.changePassword({ user: req.user, ...req.valid.body, req }),
   );
};

module.exports = {
   register,
   resendVerification,
   verify,
   login,
   refresh,
   logout,
   logoutAll,
   me,
   listSessions,
   revokeSession,
   forgotPassword,
   resetPassword,
   changePassword,
};
