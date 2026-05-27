const mongoose = require('mongoose');

const providerOfferSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceProvider',
      required: true,
    },
    providerName: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const sosEventSchema = new mongoose.Schema(
  {
    ticket: {
      type: String,
      required: true,
      trim: true,
    },
    requesterType: {
      type: String,
      enum: ['motorist', 'provider'],
      required: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requesterProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceProvider',
    },
    requesterName: {
      type: String,
      required: true,
      trim: true,
    },
    requesterPhoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    assignedProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceProvider',
    },
    assignedProviderName: {
      type: String,
      trim: true,
    },
    emergencyType: {
      type: String,
      required: true,
      trim: true,
    },
    requiredServiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCatalog',
      required: true,
    },
    requiredServiceName: {
      type: String,
      required: true,
      trim: true,
    },
    requestImages: {
      type: [String],
      default: [],
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
    note: {
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
    directProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceProvider',
    },
    directProviderName: {
      type: String,
      trim: true,
    },
    dispatchQueue: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ServiceProvider',
        },
      ],
      default: [],
    },
    currentDispatchIndex: {
      type: Number,
      default: 0,
    },
    currentNotifiedProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceProvider',
    },
    currentNotifiedProviderName: {
      type: String,
      trim: true,
    },
    ringStartedAt: Date,
    ringExpiresAt: Date,
    allowProviderOffers: {
      type: Boolean,
      default: false,
    },
    providerOffers: {
      type: [providerOfferSchema],
      default: [],
    },
    status: {
      type: String,
      enum: [
        'awaiting_provider',
        'accepted_by_provider',
        'rejected_by_provider',
        'transferred',
        'resolved',
        'cancelled',
      ],
      default: 'awaiting_provider',
    },
    smsSent: { type: Boolean, default: false },
    contactsNotified: { type: Number, default: 0 },
    cancelled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

sosEventSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('SosEvent', sosEventSchema);
