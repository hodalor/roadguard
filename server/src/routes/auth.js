const express = require('express');
const mongoose = require('mongoose');

const firebaseAuth = require('../middleware/firebaseAuth');
const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');
const { store } = require('../utils/mvpStore');

const router = express.Router();

function hasDatabaseConnection() {
  return mongoose.connection.readyState === 1;
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function isValidPin(pin) {
  return /^\d{4}$/.test(String(pin || ''));
}

function mapMotorist(user) {
  if (!user) {
    return null;
  }

  return {
    id: String(user._id || user.id),
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    address: user.address,
    idType: user.idType,
    idNumber: user.idNumber,
    email: user.email || null,
    profileImageData: user.profileImageData || null,
    role: user.role || 'motorist',
    createdAt: user.createdAt,
  };
}

function mapProvider(provider) {
  if (!provider) {
    return null;
  }

  return {
    id: String(provider._id || provider.id),
    providerCode: `PROV-${String(provider._id || provider.id).slice(-5).toUpperCase()}`,
    fullName: provider.fullName,
    businessName: provider.businessName,
    phoneNumber: provider.phoneNumber,
    phone: provider.phoneNumber,
    address: provider.address,
    email: provider.email || null,
    idType: provider.idType,
    idNumber: provider.idNumber,
    profileImageData: provider.profileImageData || '',
    serviceId: String(provider.serviceId?._id || provider.serviceId || ''),
    serviceType: provider.serviceName || '',
    serviceName: provider.serviceName || '',
    serviceArea: provider.serviceArea || provider.address,
    coverage: provider.serviceArea || provider.address,
    currentLocationLabel: provider.currentLocationLabel || '',
    currentLocationMapUrl: provider.currentLocationMapUrl || '',
    availabilityStatus: provider.availabilityStatus || 'offline',
    approvalStatus: provider.approvalStatus || 'pending',
    verificationStatus: toTitleCase(provider.approvalStatus || 'pending'),
    rating: provider.rating ?? 0,
    shopImagesCount: Array.isArray(provider.shopImages) ? provider.shopImages.length : 0,
    createdAt: provider.createdAt,
  };
}

router.get('/verify', firebaseAuth, (req, res) => {
  res.json({
    message: 'Firebase token verified',
    user: {
      uid: req.firebaseUser.uid,
      email: req.firebaseUser.email || null,
      phoneNumber: req.firebaseUser.phone_number || null,
    },
  });
});

router.post('/login', async (req, res) => {
  const { phoneNumber, pin } = req.body;

  if (!phoneNumber || !isValidPin(pin)) {
    return res.status(400).json({
      message: 'phoneNumber and a valid 4-digit pin are required.',
    });
  }

  try {
    let motorist = null;
    let provider = null;

    if (hasDatabaseConnection()) {
      [motorist, provider] = await Promise.all([
        User.findOne({ role: 'motorist', phoneNumber }),
        ServiceProvider.findOne({ phoneNumber }).populate('serviceId', 'name'),
      ]);
    } else {
      motorist = store.motorists.find((item) => item.phoneNumber === phoneNumber) || null;
      provider = store.providers.find((item) => item.phoneNumber === phoneNumber) || null;
    }

    if (!motorist && !provider) {
      return res.status(404).json({
        message: 'No account exists for that phone number.',
      });
    }

    const expectedPin = String(motorist?.pin || provider?.pin || '1234');
    if (pin !== expectedPin) {
      return res.status(401).json({
        message: 'Incorrect PIN.',
      });
    }

    return res.json({
      message: 'Login successful.',
      data: {
        phoneNumber,
        motorist: mapMotorist(motorist),
        provider: mapProvider(provider),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to complete login.',
      error: error.message,
    });
  }
});

router.patch('/reset-pin', async (req, res) => {
  const { phoneNumber, currentPin, newPin } = req.body;

  if (!phoneNumber || !isValidPin(currentPin) || !isValidPin(newPin)) {
    return res.status(400).json({
      message: 'phoneNumber, currentPin, and newPin must be valid 4-digit values.',
    });
  }

  try {
    let motorist = null;
    let provider = null;

    if (hasDatabaseConnection()) {
      [motorist, provider] = await Promise.all([
        User.findOne({ role: 'motorist', phoneNumber }),
        ServiceProvider.findOne({ phoneNumber }).populate('serviceId', 'name'),
      ]);
    } else {
      motorist = store.motorists.find((item) => item.phoneNumber === phoneNumber) || null;
      provider = store.providers.find((item) => item.phoneNumber === phoneNumber) || null;
    }

    if (!motorist && !provider) {
      return res.status(404).json({
        message: 'No account exists for that phone number.',
      });
    }

    const expectedPin = String(motorist?.pin || provider?.pin || '1234');
    if (currentPin !== expectedPin) {
      return res.status(401).json({
        message: 'Current PIN is incorrect.',
      });
    }

    if (hasDatabaseConnection()) {
      await Promise.all([
        motorist
          ? User.updateOne({ _id: motorist._id }, { pin: newPin })
          : Promise.resolve(),
        provider
          ? ServiceProvider.updateOne({ _id: provider._id }, { pin: newPin })
          : Promise.resolve(),
      ]);

      const [updatedMotorist, updatedProvider] = await Promise.all([
        motorist ? User.findById(motorist._id) : null,
        provider ? ServiceProvider.findById(provider._id).populate('serviceId', 'name') : null,
      ]);

      return res.json({
        message: 'PIN reset successfully.',
        data: {
          phoneNumber,
          motorist: mapMotorist(updatedMotorist),
          provider: mapProvider(updatedProvider),
        },
      });
    }

    if (motorist) {
      motorist.pin = newPin;
    }
    if (provider) {
      provider.pin = newPin;
    }

    return res.json({
      message: 'PIN reset successfully.',
      data: {
        phoneNumber,
        motorist: mapMotorist(motorist),
        provider: mapProvider(provider),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to reset PIN.',
      error: error.message,
    });
  }
});

module.exports = router;
