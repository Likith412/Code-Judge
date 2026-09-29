const { Schema, model } = require("mongoose");

// One row per refresh token; tokens from the same login share a familyId.
const sessionSchema = new Schema(
   {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      familyId: { type: String, required: true },

      tokenHash: { type: String, required: true, unique: true },

      // Stores the token this one replaced, so simultaneous refreshes work safely.
      previousTokenHash: String,

      status: {
         type: String,
         enum: ["ACTIVE", "ROTATED", "REVOKED"],
         required: true,
         default: "ACTIVE",
      },
      revokedReason: {
         type: String,
         enum: [
            "LOGOUT",
            "LOGOUT_ALL",
            "REUSE_DETECTED",
            "PASSWORD_CHANGE",
            "ADMIN",
            "EXPIRED",
         ],
      },

      ip: String,
      userAgent: String,
      device: {
         browser: String,
         os: String,
      },

      // When this device signed in. Copied on each refresh, so it never moves.
      signedInAt: { type: Date, required: true, default: Date.now },

      // When the session was last exchanged for a new access token.
      lastUsedAt: { type: Date, required: true, default: Date.now },
      expiresAt: { type: Date, required: true },
   },
   { timestamps: true },
);

sessionSchema.index({ userId: 1, status: 1 });
// Used to detect token reuse; sparse because most tokens have no previous token.
sessionSchema.index({ previousTokenHash: 1 }, { sparse: true });
sessionSchema.index({ familyId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model("Session", sessionSchema);
