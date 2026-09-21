const { Schema, model } = require("mongoose");

// The one-time links sent by email: verify the address, reset the password.
const authTokenSchema = new Schema(
   {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      type: {
         type: String,
         enum: ["EMAIL_VERIFY", "PASSWORD_RESET"],
         required: true,
      },

      tokenHash: { type: String, required: true, unique: true },

      usedAt: Date,
      requestIp: String,
      expiresAt: { type: Date, required: true },
   },
   { timestamps: { createdAt: true, updatedAt: false } },
);

authTokenSchema.index({ userId: 1, type: 1 });
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model("AuthToken", authTokenSchema);
