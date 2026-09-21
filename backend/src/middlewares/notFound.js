const { ApiError } = require("../utils/ApiError");

const notFound = (req, _res, next) => {
   next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
};

module.exports = notFound;
