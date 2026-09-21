const { ApiError } = require("../utils/ApiError");

const requireVerifiedEmail = (req, _res, next) => {
   if (!req.user.emailVerified) {
      return next(
         new ApiError("EMAIL_NOT_VERIFIED", "Confirm your email address first"),
      );
   }

   next();
};

module.exports = requireVerifiedEmail;
