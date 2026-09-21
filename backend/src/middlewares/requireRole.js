const { ApiError } = require("../utils/ApiError");

// The roles stack: an admin can do anything a setter can, a setter anything a
// user can. requireRole("SETTER") therefore lets an admin through as well.
const RANK = { USER: 0, SETTER: 1, ADMIN: 2 };

const requireRole = (role) => (req, _res, next) => {
   if (RANK[req.user.role] < RANK[role]) {
      return next(ApiError.forbidden(`This needs the ${role} role`));
   }

   next();
};

module.exports = requireRole;
