const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/User');
const { issueSessionToken } = require('../utils/authSession');
const { logAuditEvent } = require('../utils/auditLogger');
const { normalizePhoneNumber, verifyPin, isHashedPin, hashPin, isValidPin } = require('../utils/pinAuth');

const router = express.Router();

function hasDatabaseConnection() {
  return mongoose.connection.readyState === 1;
}

function mapAdmin(user) {
  return {
    id: String(user._id || user.id),
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    email: user.email || null,
    address: user.address,
    role: user.role || 'admin',
    isVerified: Boolean(user.isVerified),
    createdAt: user.createdAt,
  };
}

router.get('/users', async (_req, res) => {
  if (!hasDatabaseConnection()) {
    return res.status(503).json({
      message: 'Database connection is required to load admin users.',
    });
  }

  try {
    const admins = await User.find({ role: 'admin' }).sort({ createdAt: -1 });
    return res.json(admins.map(mapAdmin));
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to load admin users.',
      error: error.message,
    });
  }
});

router.post('/auth/login', async (req, res) => {
  if (!hasDatabaseConnection()) {
    return res.status(503).json({
      message: 'Database connection is required to log in an admin.',
    });
  }

  const phoneNumber = normalizePhoneNumber(req.body?.phoneNumber);
  const pin = String(req.body?.pin || '').trim();

  if (!phoneNumber || !isValidPin(pin)) {
    return res.status(400).json({
      message: 'phoneNumber and a valid 4-digit pin are required.',
    });
  }

  try {
    const admin = await User.findOne({ role: 'admin', phoneNumber });

    if (!admin) {
      return res.status(404).json({
        message: 'No admin account exists for that phone number.',
      });
    }

    if (!verifyPin(pin, admin.pin)) {
      await logAuditEvent({
        level: 'warning',
        category: 'admin_auth',
        action: 'admin_login_failed_incorrect_pin',
        actorType: 'admin',
        actorId: String(admin._id),
        phoneNumber,
        message: 'Admin login failed because the PIN was incorrect.',
        endpoint: '/api/admin/auth/login',
      });

      return res.status(401).json({
        message: 'Incorrect PIN.',
      });
    }

    if (!isHashedPin(admin.pin)) {
      admin.pin = hashPin(pin);
      await admin.save();
    }

    const session = issueSessionToken({ phoneNumber, roles: ['admin'] });

    await logAuditEvent({
      level: 'info',
      category: 'admin_auth',
      action: 'admin_login_succeeded',
      actorType: 'admin',
      actorId: String(admin._id),
      phoneNumber,
      message: 'Admin login successful.',
      endpoint: '/api/admin/auth/login',
    });

    return res.json({
      message: 'Admin login successful.',
      data: {
        admin: mapAdmin(admin),
        sessionToken: session.token,
        sessionExpiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to log in admin.',
      error: error.message,
    });
  }
});

module.exports = router;
