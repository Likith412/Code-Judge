const { ApiError } = require("../utils/ApiError");

const ROLES = ["USER", "SETTER", "ADMIN"];

const requireRole = (roles) => {
   const allowed = [].concat(roles).map((role) => String(role).toUpperCase());

   // Validate the role when mounting the route to catch typos early.
   const unknown = allowed.filter((role) => !ROLES.includes(role));

   if (!allowed.length) throw new Error("requireRole: no roles given");

   if (unknown.length)
      throw new Error(`requireRole: no such role: ${unknown.join(", ")}`);

   return (req, _res, next) => {
      if (!allowed.includes(req.user.role)) {
         return next(
            ApiError.forbidden(`This needs the ${allowed.join(" or ")} role`),
         );
      }

      next();
   };
};

module.exports = requireRole;
