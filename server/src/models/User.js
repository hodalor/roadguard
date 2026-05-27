const mongoose = require('mongoose');

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
      default: '1234',
    },
    isVerified: { type: Boolean, default: false },
    vehicle: vehicleSchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
