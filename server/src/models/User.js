const mongoose = require('mongoose');

const { hashPin, isStoredPinFormat } = require('../utils/pinAuth');
const emergencyContactEntrySchema = require('./schemas/EmergencyContactEntry');

const vehicleSchema = new mongoose.Schema(
  {
    make: String,
    model: String,
    year: Number,
    plateNumber: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['motorist', 'admin'],
      default: 'motorist',
    },
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    address: { type: String, required: true },
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
    email: {
      type: String,
      trim: true,
      lowercase: true,
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
    isVerified: { type: Boolean, default: false },
    vehicle: vehicleSchema,
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

module.exports = mongoose.model('User', userSchema);
