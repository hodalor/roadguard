const { normalizePhoneNumber } = require('./pinAuth');

function mapEmergencyContact(entry = {}) {
  return {
    name: String(entry.name || '').trim(),
    phoneNumber: String(entry.phoneNumber || '').trim(),
    email: entry.email ? String(entry.email).trim().toLowerCase() : null,
    relationship: String(entry.relationship || '').trim(),
    notifyViaSms: entry.notifyViaSms !== false,
    notifyViaEmail: entry.notifyViaEmail !== false,
  };
}

function normalizeEmergencyContacts(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => ({
      name: String(entry?.name || '').trim(),
      phoneNumber: normalizePhoneNumber(entry?.phoneNumber),
      email: entry?.email ? String(entry.email).trim().toLowerCase() : undefined,
      relationship: String(entry?.relationship || '').trim(),
      notifyViaSms: entry?.notifyViaSms !== false,
      notifyViaEmail: entry?.notifyViaEmail !== false,
    }))
    .filter(
      (entry) =>
        entry.name ||
        entry.phoneNumber ||
        entry.email ||
        entry.relationship
    );
}

function validateEmergencyContacts(entries) {
  if (!Array.isArray(entries) || entries.length < 3) {
    return 'At least three emergency contacts are required.';
  }

  for (const entry of entries) {
    if (!entry.name || !entry.phoneNumber || !entry.relationship) {
      return 'Each emergency contact must include name, phone number, and relationship.';
    }
  }

  return null;
}

module.exports = {
  mapEmergencyContact,
  normalizeEmergencyContacts,
  validateEmergencyContacts,
};
