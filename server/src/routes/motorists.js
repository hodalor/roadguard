const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/User');
const { store, upsertMotorist } = require('../utils/mvpStore');

const router = express.Router();

function hasDatabaseConnection() {
  return mongoose.connection.readyState === 1;
}

function mapMotorist(user) {
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

function isValidPin(pin) {
  return /^\d{4}$/.test(String(pin || ''));
}

router.get('/', async (_req, res) => {
  try {
    if (hasDatabaseConnection()) {
      const motorists = await User.find({ role: 'motorist' }).sort({ createdAt: -1 });
      return res.json(motorists.map(mapMotorist));
    }

    return res.json(store.motorists ?? []);
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to load motorists.',
      error: error.message,
    });
  }
});

router.post('/', async (req, res) => {
  const {
    fullName,
    phoneNumber,
    address,
    idType,
    idNumber,
    email,
    profileImageData,
    pin,
  } = req.body;

  if (!fullName || !phoneNumber || !address || !idType || !idNumber || !profileImageData) {
    return res.status(400).json({
      message:
        'fullName, phoneNumber, address, idType, idNumber, and profileImageData are required.',
    });
  }

  if (pin !== undefined && !isValidPin(pin)) {
    return res.status(400).json({
      message: 'pin must be exactly 4 digits.',
    });
  }

  try {
    if (hasDatabaseConnection()) {
      const existingMotorist = await User.findOne({ phoneNumber, role: 'motorist' });
      const motorist = await User.findOneAndUpdate(
        { phoneNumber },
        {
          role: 'motorist',
          fullName,
          phoneNumber,
          address,
          idType,
          idNumber,
          email: email || undefined,
          profileImageData,
          pin: pin || existingMotorist?.pin || '1234',
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      );

      return res.status(201).json({
        message: 'Motorist account saved.',
        data: mapMotorist(motorist),
      });
    }

    const motorist = upsertMotorist({
      fullName,
      phoneNumber,
      address,
      idType,
      idNumber,
      email,
      profileImageData,
      pin,
    });

    return res.status(201).json({
      message: 'Motorist account saved.',
      data: motorist,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to save motorist account.',
      error: error.message,
    });
  }
});

module.exports = router;
