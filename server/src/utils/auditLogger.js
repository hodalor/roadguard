const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const AuditLog = require('../models/AuditLog');
const { store } = require('./mvpStore');

function hasDatabaseConnection() {
  return mongoose.connection.readyState === 1;
}

function mapAuditLog(record) {
  if (!record) {
    return null;
  }

  return {
    id: String(record._id || record.id),
    level: record.level || 'info',
    category: record.category || 'system',
    action: record.action || '',
    actorType: record.actorType || 'system',
    actorId: record.actorId || null,
    phoneNumber: record.phoneNumber || null,
    message: record.message || '',
    detail: record.detail || '',
    endpoint: record.endpoint || '',
    metadata: record.metadata || null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function logAuditEvent({
  level = 'info',
  category = 'system',
  action,
  actorType = 'system',
  actorId,
  phoneNumber,
  message,
  detail,
  endpoint,
  metadata,
}) {
  const payload = {
    level,
    category,
    action,
    actorType,
    actorId,
    phoneNumber,
    message,
    detail,
    endpoint,
    metadata,
  };

  try {
    if (hasDatabaseConnection()) {
      const record = await AuditLog.create(payload);
      return mapAuditLog(record);
    }
  } catch (_error) {
    // Keep the app flowing even if audit persistence fails.
  }

  const timestamp = new Date().toISOString();
  const record = {
    id: `audit-${randomUUID().slice(0, 8)}`,
    ...payload,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.auditLogs.unshift(record);
  return mapAuditLog(record);
}

async function listAuditLogs() {
  if (hasDatabaseConnection()) {
    const records = await AuditLog.find().sort({ createdAt: -1 }).limit(200);
    return records.map(mapAuditLog);
  }

  return store.auditLogs.map(mapAuditLog);
}

module.exports = {
  listAuditLogs,
  logAuditEvent,
  mapAuditLog,
};
