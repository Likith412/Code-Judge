const STATUS = {
   BAD_REQUEST: 400,
   UNAUTHENTICATED: 401,
   FORBIDDEN: 403,
   NOT_FOUND: 404,
   CONFLICT: 409,
   PAYLOAD_TOO_LARGE: 413,
   UNSUPPORTED_MEDIA_TYPE: 415,
   VALIDATION_ERROR: 422,
   RATE_LIMITED: 429,
   INTERNAL: 500,
};

class ApiError extends Error {
   constructor(code, message, details) {
      super(message);
      this.code = code;
      this.status = STATUS[code] || 500;
      this.details = details;
   }

   static badRequest(m = "Bad request") {
      return new ApiError("BAD_REQUEST", m);
   }
   static unauthenticated(m = "Not signed in") {
      return new ApiError("UNAUTHENTICATED", m);
   }
   static forbidden(m = "Your role cannot do this") {
      return new ApiError("FORBIDDEN", m);
   }
   static notFound(m = "Not found") {
      return new ApiError("NOT_FOUND", m);
   }
   static conflict(m = "Already exists") {
      return new ApiError("CONFLICT", m);
   }
   static payloadTooLarge(m = "Body is too large") {
      return new ApiError("PAYLOAD_TOO_LARGE", m);
   }
   static validation(m = "Invalid input", d) {
      return new ApiError("VALIDATION_ERROR", m, d);
   }
   static rateLimited(m = "Too many requests") {
      return new ApiError("RATE_LIMITED", m);
   }
}

module.exports = { ApiError, STATUS };
