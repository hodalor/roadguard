const crypto = require('crypto');

const PIN_HASH_PREFIX = 'scrypt';

function isValidPin(pin) {
  return /^\d{4}$/.test(String(pin || '').trim());
}

function normalizePhoneNumber(phoneNumber) {
  return String(phoneNumber || '')
    .trim()
    .replace(/[\s()-]/g, '');
}

function hashPin(pin) {
  const normalizedPin = String(pin || '').trim();
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(normalizedPin, salt, 64).toString('hex');
  return `${PIN_HASH_PREFIX}$${salt}$${derivedKey}`;
}

function isHashedPin(value) {
  return String(value || '').startsWith(`${PIN_HASH_PREFIX}$`);
}

function isStoredPinFormat(value) {
  return isHashedPin(value) || isValidPin(value);
}

function verifyPin(inputPin, storedPin) {
  const normalizedInput = String(inputPin || '').trim();
  const normalizedStored = String(storedPin || '').trim();

  if (!normalizedStored) {
    return false;
  }

  if (!isHashedPin(normalizedStored)) {
    return normalizedInput === normalizedStored;
  }

  const [, salt, expectedHash] = normalizedStored.split('$');
  if (!salt || !expectedHash) {
    return false;
  }

  const derivedBuffer = crypto.scryptSync(normalizedInput, salt, 64);
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (derivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedBuffer, expectedBuffer);
}

module.exports = {
  hashPin,
  isHashedPin,
  isStoredPinFormat,
  isValidPin,
  normalizePhoneNumber,
  verifyPin,
};
