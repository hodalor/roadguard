const mongoose = require('mongoose');

const hazardReportSchema = new mongoose.Schema(
  {
    reportCode: {
      type: String,
      trim: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requesterProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceProvider',
    },
    reporterName: {
      type: String,
      trim: true,
      default: '',
    },
    hazardType: { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    locationLabel: {
      type: String,
      required: true,
      trim: true,
    },
    locationMapUrl: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    photoData: {
      type: String,
      default: '',
    },
    confirmations: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'under_review', 'resolved'],
      default: 'under_review',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: { type: Boolean, default: true },
    expiresAt: Date,
  },
  { timestamps: true }
);

hazardReportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('HazardReport', hazardReportSchema);
