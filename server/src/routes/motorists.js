const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/User');
const { store, upsertMotorist } = require('../utils/mvpStore');
const { logAuditEvent } = require('../utils/auditLogger');
const { hashPin, isValidPin, normalizePhoneNumber } = require('../utils/pinAuth');

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
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

  if (!fullName || !normalizedPhoneNumber || !address || !idType || !idNumber || !profileImageData) {
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
      const existingMotorist = await User.findOne({
        phoneNumber: normalizedPhoneNumber,
        role: 'motorist',
      });
      const motorist = await User.findOneAndUpdate(
        { phoneNumber: normalizedPhoneNumber },
        {
          role: 'motorist',
          fullName,
          phoneNumber: normalizedPhoneNumber,
          address,
          idType,
          idNumber,
          email: email || undefined,
          profileImageData,
          pin: pin
            ? hashPin(pin)
            : existingMotorist?.pin || hashPin('1234'),
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      );

      await logAuditEvent({
        level: 'info',
        category: 'auth',
        action: existingMotorist ? 'motorist_account_updated' : 'motorist_account_created',
        actorType: 'motorist',
        actorId: String(motorist._id),
        phoneNumber: normalizedPhoneNumber,
        message: existingMotorist
          ? 'Motorist account updated successfully.'
          : 'Motorist account created successfully.',
        endpoint: '/api/motorists',
      });

      return res.status(201).json({
        message: 'Motorist account saved.',
        data: mapMotorist(motorist),
      });
    }

    const motorist = upsertMotorist({
      fullName,
      phoneNumber: normalizedPhoneNumber,
      address,
      idType,
      idNumber,
      email,
      profileImageData,
      pin: pin ? hashPin(pin) : undefined,
    });

    await logAuditEvent({
      level: 'info',
      category: 'auth',
      action: 'motorist_account_saved_local',
      actorType: 'motorist',
      actorId: motorist.id,
      phoneNumber: normalizedPhoneNumber,
      message: 'Motorist account saved in local fallback store.',
      endpoint: '/api/motorists',
    });

    return res.status(201).json({
      message: 'Motorist account saved.',
      data: motorist,
    });
  } catch (error) {
    await logAuditEvent({
      level: 'error',
      category: 'auth',
      action: 'motorist_account_save_failed',
      actorType: 'motorist',
      phoneNumber: normalizedPhoneNumber,
      message: 'Unable to save motorist account.',
      detail: error.message,
      endpoint: '/api/motorists',
    });

    return res.status(500).json({
      message: 'Unable to save motorist account.',
      error: error.message,
    });
  }
});

module.exports = router;
