const { ZodError } = require("zod");

const { ApiError } = require("../utils/ApiError");

const fromZod = (err) =>
   ApiError.validation(
      "Invalid input",
      err.issues.map((issue) => ({
         field: issue.path.join("."),
         issue: issue.message,
      })),
   );

// express.json() rejects the body before any route runs.
const fromBodyParser = (err) => {
   if (err.type === "entity.parse.failed")
      return ApiError.badRequest("Body is not valid JSON");
   if (err.type === "entity.too.large") return ApiError.payloadTooLarge();
   return null;
};

// The one place an error becomes JSON.
const errorHandler = (logger) => (err, req, res, _next) => {
   let error = err;

   if (error instanceof ZodError) error = fromZod(error);

   if (!(error instanceof ApiError)) error = fromBodyParser(error) || error;

   if (!(error instanceof ApiError)) {
      logger.error({ err, reqId: req.id }, "unhandled error");
      error = new ApiError("INTERNAL", "Something went wrong");
   }

   res.status(error.status).json({
      error: {
         code: error.code,
         message: error.message,
         details: error.details,
         requestId: req.id,
      },
   });
};

module.exports = errorHandler;
