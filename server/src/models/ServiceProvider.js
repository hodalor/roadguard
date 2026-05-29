const mongoose = require('mongoose');

const { hashPin, isStoredPinFormat } = require('../utils/pinAuth');
const emergencyContactEntrySchema = require('./schemas/EmergencyContactEntry');

const serviceProviderSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    businessName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    address: { type: String, required: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    idType: {
      type: String,
      required: true,
      trim: true,
    },
    idNumber: {
      type: String,
      required: true,
      trim: true,
    },
    profileImageData: {
      type: String,
      required: true,
    },
    pin: {
      type: String,
      trim: true,
      default: () => hashPin('1234'),
      validate: {
        validator(value) {
          return isStoredPinFormat(value);
        },
        message: 'pin must be a valid stored PIN value.',
      },
    },
    shopImages: {
      type: [String],
      validate: {
        validator(images) {
          return Array.isArray(images) && images.length >= 3;
        },
        message: 'At least three shop images are required.',
      },
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCatalog',
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
      trim: true,
    },
    serviceArea: {
      type: String,
      required: true,
      trim: true,
    },
    currentLocation: {
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
    currentLocationLabel: {
      type: String,
      trim: true,
    },
    currentLocationMapUrl: {
      type: String,
      trim: true,
    },
    availabilityStatus: {
      type: String,
      enum: ['available', 'busy', 'offline'],
      default: 'available',
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rating: { type: Number, default: 0 },
    emergencyContacts: {
      type: [emergencyContactEntrySchema],
      default: [],
      validate: {
        validator(entries) {
          return Array.isArray(entries) && entries.length >= 3;
        },
        message: 'At least three emergency contacts are required.',
      },
    },
  },
  { timestamps: true }
);

serviceProviderSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('ServiceProvider', serviceProviderSchema);
