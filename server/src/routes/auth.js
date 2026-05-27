const express = require('express');
const mongoose = require('mongoose');

const firebaseAuth = require('../middleware/firebaseAuth');
const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');
const { store } = require('../utils/mvpStore');
const { issueSessionToken, revokeSessionToken, verifySessionToken } = require('../utils/authSession');
const { logAuditEvent } = require('../utils/auditLogger');
const {
  hashPin,
  isHashedPin,
  isValidPin,
  normalizePhoneNumber,
  verifyPin,
} = require('../utils/pinAuth');

const router = express.Router();

function hasDatabaseConnection() {
  return mongoose.connection.readyState === 1;
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
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

function buildAuthPayload({ phoneNumber, motorist, provider }) {
  const roles = [
    ...(motorist ? ['motorist'] : []),
    ...(provider ? ['provider'] : []),
  ];
  const session = issueSessionToken({ phoneNumber, roles });

  return {
    phoneNumber,
    motorist: mapMotorist(motorist),
    provider: mapProvider(provider),
    sessionToken: session.token,
    sessionExpiresAt: session.expiresAt,
  };
}

function hasMatchingPin(pin, motorist, provider) {
  return [motorist?.pin, provider?.pin]
    .filter(Boolean)
    .some((storedPin) => verifyPin(pin, storedPin));
}

async function migrateLegacyPins({ motorist, provider, pin }) {
  if (!hasDatabaseConnection()) {
    return;
  }

  const nextPin = hashPin(pin);
  await Promise.all([
    motorist && !isHashedPin(motorist.pin)
      ? User.updateOne({ _id: motorist._id }, { pin: nextPin })
      : Promise.resolve(),
    provider && !isHashedPin(provider.pin)
      ? ServiceProvider.updateOne({ _id: provider._id }, { pin: nextPin })
      : Promise.resolve(),
  ]);
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
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

  if (!normalizedPhoneNumber || !isValidPin(pin)) {
    return res.status(400).json({
      message: 'phoneNumber and a valid 4-digit pin are required.',
    });
  }

  try {
    let motorist = null;
    let provider = null;

    if (hasDatabaseConnection()) {
      [motorist, provider] = await Promise.all([
        User.findOne({ role: 'motorist', phoneNumber: normalizedPhoneNumber }),
        ServiceProvider.findOne({ phoneNumber: normalizedPhoneNumber }).populate('serviceId', 'name'),
      ]);
    } else {
      motorist =
        store.motorists.find((item) => item.phoneNumber === normalizedPhoneNumber) || null;
      provider =
        store.providers.find((item) => item.phoneNumber === normalizedPhoneNumber) || null;
    }

    if (!motorist && !provider) {
      await logAuditEvent({
        level: 'warning',
        category: 'auth',
        action: 'login_failed_unknown_phone',
        actorType: 'guest',
        phoneNumber: normalizedPhoneNumber,
        message: 'Login failed because no account exists for the supplied phone number.',
        endpoint: '/api/auth/login',
      });

      return res.status(404).json({
        message: 'No account exists for that phone number.',
      });
    }

    if (!hasMatchingPin(pin, motorist, provider)) {
      await logAuditEvent({
        level: 'warning',
        category: 'auth',
        action: 'login_failed_incorrect_pin',
        actorType: 'guest',
        phoneNumber: normalizedPhoneNumber,
        message: 'Login failed because the supplied PIN was incorrect.',
        endpoint: '/api/auth/login',
      });

      return res.status(401).json({
        message: 'Incorrect PIN.',
      });
    }

    await migrateLegacyPins({ motorist, provider, pin });

    const payload = buildAuthPayload({
      phoneNumber: normalizedPhoneNumber,
      motorist,
      provider,
    });

    await logAuditEvent({
      level: 'info',
      category: 'auth',
      action: 'login_succeeded',
      actorType: provider ? 'provider' : 'motorist',
      actorId: String(provider?._id || provider?.id || motorist?._id || motorist?.id || ''),
      phoneNumber: normalizedPhoneNumber,
      message: 'User logged in successfully.',
      endpoint: '/api/auth/login',
      metadata: {
        roles: payload.provider && payload.motorist ? ['motorist', 'provider'] : payload.provider ? ['provider'] : ['motorist'],
      },
    });

    return res.json({
      message: 'Login successful.',
      data: payload,
    });
  } catch (error) {
    await logAuditEvent({
      level: 'error',
      category: 'auth',
      action: 'login_failed_server_error',
      actorType: 'guest',
      phoneNumber: normalizedPhoneNumber,
      message: 'Unable to complete login.',
      detail: error.message,
      endpoint: '/api/auth/login',
    });

    return res.status(500).json({
      message: 'Unable to complete login.',
      error: error.message,
    });
  }
});

router.patch('/reset-pin', async (req, res) => {
  const { phoneNumber, currentPin, newPin } = req.body;
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

  if (!normalizedPhoneNumber || !isValidPin(currentPin) || !isValidPin(newPin)) {
    return res.status(400).json({
      message: 'phoneNumber, currentPin, and newPin must be valid 4-digit values.',
    });
  }

  try {
    let motorist = null;
    let provider = null;

    if (hasDatabaseConnection()) {
      [motorist, provider] = await Promise.all([
        User.findOne({ role: 'motorist', phoneNumber: normalizedPhoneNumber }),
        ServiceProvider.findOne({ phoneNumber: normalizedPhoneNumber }).populate('serviceId', 'name'),
      ]);
    } else {
      motorist =
        store.motorists.find((item) => item.phoneNumber === normalizedPhoneNumber) || null;
      provider =
        store.providers.find((item) => item.phoneNumber === normalizedPhoneNumber) || null;
    }

    if (!motorist && !provider) {
      await logAuditEvent({
        level: 'warning',
        category: 'auth',
        action: 'reset_pin_failed_unknown_phone',
        actorType: 'guest',
        phoneNumber: normalizedPhoneNumber,
        message: 'PIN reset failed because no account exists for the supplied phone number.',
        endpoint: '/api/auth/reset-pin',
      });

      return res.status(404).json({
        message: 'No account exists for that phone number.',
      });
    }

    if (!hasMatchingPin(currentPin, motorist, provider)) {
      await logAuditEvent({
        level: 'warning',
        category: 'auth',
        action: 'reset_pin_failed_incorrect_pin',
        actorType: 'guest',
        phoneNumber: normalizedPhoneNumber,
        message: 'PIN reset failed because the current PIN was incorrect.',
        endpoint: '/api/auth/reset-pin',
      });

      return res.status(401).json({
        message: 'Current PIN is incorrect.',
      });
    }

    const nextStoredPin = hashPin(newPin);

    if (hasDatabaseConnection()) {
      await Promise.all([
        motorist
          ? User.updateOne({ _id: motorist._id }, { pin: nextStoredPin })
          : Promise.resolve(),
        provider
          ? ServiceProvider.updateOne({ _id: provider._id }, { pin: nextStoredPin })
          : Promise.resolve(),
      ]);

      const [updatedMotorist, updatedProvider] = await Promise.all([
        motorist ? User.findById(motorist._id) : null,
        provider ? ServiceProvider.findById(provider._id).populate('serviceId', 'name') : null,
      ]);

      const payload = buildAuthPayload({
        phoneNumber: normalizedPhoneNumber,
        motorist: updatedMotorist,
        provider: updatedProvider,
      });

      await logAuditEvent({
        level: 'info',
        category: 'auth',
        action: 'pin_reset_succeeded',
        actorType: updatedProvider ? 'provider' : 'motorist',
        actorId: String(
          updatedProvider?._id ||
            updatedProvider?.id ||
            updatedMotorist?._id ||
            updatedMotorist?.id ||
            ''
        ),
        phoneNumber: normalizedPhoneNumber,
        message: 'PIN reset successfully.',
        endpoint: '/api/auth/reset-pin',
      });

      return res.json({
        message: 'PIN reset successfully.',
        data: payload,
      });
    }

    if (motorist) {
      motorist.pin = nextStoredPin;
    }
    if (provider) {
      provider.pin = nextStoredPin;
    }

    const payload = buildAuthPayload({
      phoneNumber: normalizedPhoneNumber,
      motorist,
      provider,
    });

    await logAuditEvent({
      level: 'info',
      category: 'auth',
      action: 'pin_reset_succeeded_local',
      actorType: provider ? 'provider' : 'motorist',
      actorId: String(provider?.id || motorist?.id || ''),
      phoneNumber: normalizedPhoneNumber,
      message: 'PIN reset succeeded in local fallback store.',
      endpoint: '/api/auth/reset-pin',
    });

    return res.json({
      message: 'PIN reset successfully.',
      data: payload,
    });
  } catch (error) {
    await logAuditEvent({
      level: 'error',
      category: 'auth',
      action: 'reset_pin_failed_server_error',
      actorType: 'guest',
      phoneNumber: normalizedPhoneNumber,
      message: 'Unable to reset PIN.',
      detail: error.message,
      endpoint: '/api/auth/reset-pin',
    });

    return res.status(500).json({
      message: 'Unable to reset PIN.',
      error: error.message,
    });
  }
});

router.post('/logout', async (req, res) => {
  const { sessionToken, phoneNumber } = req.body || {};
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
  const payload = verifySessionToken(sessionToken);

  if (!payload) {
    await logAuditEvent({
      level: 'warning',
      category: 'auth',
      action: 'logout_failed_invalid_session',
      actorType: 'guest',
      phoneNumber: normalizedPhoneNumber,
      message: 'Logout failed because the session token was invalid.',
      endpoint: '/api/auth/logout',
    });

    return res.status(400).json({
      message: 'Session token is invalid or expired.',
    });
  }

  revokeSessionToken(sessionToken);

  await logAuditEvent({
    level: 'info',
    category: 'auth',
    action: 'logout_succeeded',
    actorType: 'user',
    phoneNumber: normalizedPhoneNumber || payload.phoneNumber,
    message: 'User logged out successfully.',
    endpoint: '/api/auth/logout',
    metadata: {
      roles: payload.roles || [],
      sessionExpiresAt: payload.expiresAt,
    },
  });

  return res.json({
    message: 'Logout successful.',
  });
});

module.exports = router;
