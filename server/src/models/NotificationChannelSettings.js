const mongoose = require('mongoose');

const channelProviderSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ['email', 'sms'],
      required: true,
    },
    providerKey: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

const notificationChannelSettingsSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: 'default',
      unique: true,
    },
    providers: {
      type: [channelProviderSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'NotificationChannelSettings',
  notificationChannelSettingsSchema
);
