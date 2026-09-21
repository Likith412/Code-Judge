const auth = require("../services/auth.service");
const {
   setRefreshCookie,
   clearRefreshCookie,
   readRefreshCookie,
} = require("../utils/cookies");

// What the browser is allowed to know about the signed in person.
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

// The three places that hand out a login all answer the same way: the access
// token in the body for memory, the refresh token in a cookie the page
// cannot read.
const sendLogin = (res, status, { accessToken, refreshToken, user }) => {
   setRefreshCookie(res, refreshToken);
   res.status(status).json({ accessToken, user: publicUser(user) });
};

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
