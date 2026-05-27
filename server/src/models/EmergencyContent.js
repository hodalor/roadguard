const mongoose = require('mongoose');

const emergencyContentSchema = new mongoose.Schema(
  {
    contentCode: {
      type: String,
      trim: true,
    },
    category: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    language: {
      type: String,
      trim: true,
      default: 'English',
    },
    version: { type: String, default: '1.0.0' },
    publishStatus: {
      type: String,
      enum: ['published', 'draft'],
      default: 'draft',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmergencyContent', emergencyContentSchema);
