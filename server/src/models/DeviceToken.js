const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema(
  {
    userUid: { type: String, required: true, index: true },
    fcmToken: { type: String, required: true, unique: true },
    platform: {
      type: String,
      enum: ['android', 'ios', 'web', 'unknown'],
      default: 'unknown',
    },
    isActive: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);
