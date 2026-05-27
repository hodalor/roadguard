const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    relationship: String,
    contactPhone: { type: String, required: true },
    notifyViaSms: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
