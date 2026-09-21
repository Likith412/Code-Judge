const jwt = require("jsonwebtoken");

const {
   JWT_SECRET,
   JWT_ISSUER,
   JWT_AUDIENCE,
   ACCESS_TOKEN_TTL,
} = require("../config/env");
const { ApiError } = require("../utils/ApiError");

const ALGORITHM = "HS256";

function signAccessToken({ user, sessionId }) {
   return jwt.sign(
      {
         role: user.role,
         tv: user.tokenVersion,
         sid: String(sessionId),
         typ: "access",
      },
      JWT_SECRET,
      {
         algorithm: ALGORITHM,
         subject: String(user._id),
         expiresIn: ACCESS_TOKEN_TTL,
         issuer: JWT_ISSUER,
         audience: JWT_AUDIENCE,
      },
   );
}

function verifyAccessToken(token) {
   let payload;

   try {
      payload = jwt.verify(token, JWT_SECRET, {
         algorithms: [ALGORITHM],
         issuer: JWT_ISSUER,
         audience: JWT_AUDIENCE,
      });
   } catch (err) {
      const expired = err.name === "TokenExpiredError";
      throw ApiError.unauthenticated(
         expired ? "Access token expired" : "Access token is not valid",
      );
   }

   if (payload.typ !== "access")
      throw ApiError.unauthenticated("Wrong token type");

   return payload;
}

module.exports = { signAccessToken, verifyAccessToken };
