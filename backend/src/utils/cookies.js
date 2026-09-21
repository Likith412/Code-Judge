const { NODE_ENV, COOKIE_DOMAIN, REFRESH_TOKEN_TTL } = require("../config/env");
const { toMs } = require("./duration");

const REFRESH_COOKIE = "refresh_token";

const options = () => ({
   httpOnly: true,
   secure: NODE_ENV === "production",
   sameSite: "strict",
   path: "/api/auth",
   domain: COOKIE_DOMAIN || undefined,
});

const setRefreshCookie = (res, token) =>
   res.cookie(REFRESH_COOKIE, token, {
      ...options(),
      maxAge: toMs(REFRESH_TOKEN_TTL),
   });

// Must be cleared with the same flags it was set with, or the browser keeps it.
const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, options());

const readRefreshCookie = (req) => req.cookies?.[REFRESH_COOKIE];

module.exports = {
   REFRESH_COOKIE,
   setRefreshCookie,
   clearRefreshCookie,
   readRefreshCookie,
};
