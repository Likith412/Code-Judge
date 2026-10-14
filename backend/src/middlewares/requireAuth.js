const { authenticate } = require("../utils/authenticate");
const { ApiError } = require("../utils/ApiError");

const requireAuth = async (req, _res, next) => {
   const header = req.get("authorization") || "";

   if (!header.startsWith("Bearer ")) {
      return next(ApiError.unauthenticated("No access token"));
   }

   try {
      const { user, payload } = await authenticate(header.slice(7));

      req.user = user;
      req.auth = payload;

      return next();
   } catch (err) {
      return next(err);
   }
};

module.exports = requireAuth;
