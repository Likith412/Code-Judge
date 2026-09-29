const { User } = require("../models");
const { verifyAccessToken } = require("../utils/accessToken");
const { ApiError } = require("../utils/ApiError");

const requireAuth = async (req, _res, next) => {
   const header = req.get("authorization") || "";

   if (!header.startsWith("Bearer ")) {
      return next(ApiError.unauthenticated("No access token"));
   }

   try {
      const payload = verifyAccessToken(header.slice(7));
      const user = await User.findById(payload.sub);

      if (!user || user.status === "DELETED") {
         return next(ApiError.unauthenticated("This account no longer exists"));
      }

      if (user.status === "BANNED") {
         return next(new ApiError("ACCOUNT_BANNED", "This account is banned"));
      }

      if (!user.emailVerified) {
         return next(
            new ApiError(
               "EMAIL_NOT_VERIFIED",
               "Confirm your email address first",
            ),
         );
      }

      if (payload.tv !== user.tokenVersion) {
         return next(
            new ApiError(
               "SESSION_REVOKED",
               "You were signed out. Please sign in again.",
            ),
         );
      }

      req.user = user;
      req.auth = payload;

      return next();
   } catch (err) {
      return next(err);
   }
};

module.exports = requireAuth;
