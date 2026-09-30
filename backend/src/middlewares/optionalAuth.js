const requireAuth = require("./requireAuth");

// Works signed out, but a token that was sent still has to be valid.
const optionalAuth = (req, res, next) => {
   if (!req.get("authorization")) return next();

   return requireAuth(req, res, next);
};

module.exports = optionalAuth;
