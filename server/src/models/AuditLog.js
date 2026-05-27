const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ['info', 'warning', 'error'],
      default: 'info',
    },
    category: {
      type: String,
      trim: true,
      default: 'system',
    },
    action: {
      type: String,
      trim: true,
      required: true,
    },
    actorType: {
      type: String,
      trim: true,
      default: 'system',
    },
    actorId: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      required: true,
    },
    detail: {
      type: String,
      trim: true,
    },
    endpoint: {
      type: String,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
