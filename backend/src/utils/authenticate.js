// The whole access token check. requireAuth and the socket handshake share it.
const { User } = require("../models");
const { verifyAccessToken } = require("./accessToken");
const { ApiError } = require("./ApiError");

// Returns { user, payload }, or throws the ApiError to send back.
async function authenticate(token) {
   const payload = verifyAccessToken(token);
   const user = await User.findById(payload.sub);

   if (!user || user.status === "DELETED") {
      throw ApiError.unauthenticated("This account no longer exists");
   }

   if (user.status === "BANNED") {
      throw new ApiError("ACCOUNT_BANNED", "This account is banned");
   }

   if (!user.emailVerified) {
      throw new ApiError(
         "EMAIL_NOT_VERIFIED",
         "Confirm your email address first",
      );
   }

   if (payload.tv !== user.tokenVersion) {
      throw new ApiError(
         "SESSION_REVOKED",
         "You were signed out. Please sign in again.",
      );
   }

   return { user, payload };
}

module.exports = { authenticate };
