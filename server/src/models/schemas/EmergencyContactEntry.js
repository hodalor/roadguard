const mongoose = require('mongoose');

const emergencyContactEntrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    relationship: {
      type: String,
      required: true,
      trim: true,
    },
    notifyViaSms: {
      type: Boolean,
      default: true,
    },
    notifyViaEmail: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

module.exports = emergencyContactEntrySchema;
