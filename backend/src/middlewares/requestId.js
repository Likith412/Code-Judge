const { randomUUID } = require("node:crypto");

// One id per request so a log line and an error response point at the same call.
const requestId = (req, res, next) => {
   req.id = randomUUID();
   res.set("X-Request-Id", req.id);
   next();
};

module.exports = requestId;
