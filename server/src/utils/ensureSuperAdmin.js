const mongoose = require('mongoose');

const User = require('../models/User');
const { hashPin, normalizePhoneNumber } = require('./pinAuth');

const DEFAULT_PROFILE_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiMwYjE2M2IiLz48Y2lyY2xlIGN4PSI2MCIgY3k9IjQ0IiByPSIyMCIgZmlsbD0iI2ZmNmEwMCIvPjxwYXRoIGQ9Ik0zMCA5NmMwLTE2LjYgMTMuNC0zMCAzMC0zMHMzMCAxMy40IDMwIDMwIiBmaWxsPSIjZmY2YTAwIi8+PC9zdmc+';

async function ensureSuperAdmin() {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  const phoneNumber = normalizePhoneNumber(process.env.SUPER_ADMIN_PHONE || '0200000000');
  const pin = String(process.env.SUPER_ADMIN_PIN || '1234').trim();

  if (!phoneNumber) {
    return null;
  }

  const existingByPhone = await User.findOne({ role: 'admin', phoneNumber });
  if (existingByPhone) {
    return existingByPhone;
  }

  const anyAdmin = await User.findOne({ role: 'admin' });
  if (anyAdmin) {
    return anyAdmin;
  }

  const superAdmin = await User.create({
    role: 'admin',
    fullName: process.env.SUPER_ADMIN_NAME || 'RoadGuide Super Admin',
    phoneNumber,
    address: process.env.SUPER_ADMIN_ADDRESS || 'RoadGuide HQ',
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@roadguide.local',
    idType: process.env.SUPER_ADMIN_ID_TYPE || 'Staff ID',
    idNumber: process.env.SUPER_ADMIN_ID_NUMBER || 'RG-SUPER-001',
    profileImageData: DEFAULT_PROFILE_IMAGE,
    pin: hashPin(pin),
    isVerified: true,
  });

  console.log(`Super admin seeded (${phoneNumber})`);
  return superAdmin;
}

module.exports = ensureSuperAdmin;
