const requireAuth = require("./requireAuth");

// For routes that work signed out but show more when signed in. A token that
// was sent still has to be valid, so the browser gets a 401 and refreshes it.
const optionalAuth = (req, res, next) => {
   if (!req.get("authorization")) return next();

   return requireAuth(req, res, next);
};

module.exports = optionalAuth;
