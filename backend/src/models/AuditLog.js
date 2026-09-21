const { Schema, model } = require("mongoose");

// Security events and, later, admin actions. Written, never read by the app.
const auditLogSchema = new Schema(
   {
      actorId: { type: Schema.Types.ObjectId, ref: "User" },
      action: { type: String, required: true },
      targetType: String,
      targetId: Schema.Types.ObjectId,
      meta: Schema.Types.Mixed,
      ip: String,
   },
   { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index(
   { createdAt: 1 },
   { expireAfterSeconds: 60 * 60 * 24 * 90 },
);

module.exports = model("AuditLog", auditLogSchema);
