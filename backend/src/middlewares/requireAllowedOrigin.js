const { ALLOWED_ORIGINS } = require("../config/env");
const { ApiError } = require("../utils/ApiError");

const requireAllowedOrigin = (req, _res, next) => {
   const origin = req.get("origin");

   if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return next(ApiError.forbidden("Origin not allowed"));
   }

   next();
};

module.exports = requireAllowedOrigin;
