const express = require('express');

const { listAuditLogs, logAuditEvent } = require('../utils/auditLogger');
const { normalizePhoneNumber } = require('../utils/pinAuth');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const logs = await listAuditLogs();
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to load audit logs.',
      error: error.message,
    });
  }
});

router.post('/client-error', async (req, res) => {
  const { source, action, message, detail, phoneNumber, endpoint, metadata } = req.body || {};

  if (!source || !action || !message) {
    return res.status(400).json({
      message: 'source, action, and message are required.',
    });
  }

  try {
    const record = await logAuditEvent({
      level: 'error',
      category: source,
      action,
      actorType: 'client',
      phoneNumber: normalizePhoneNumber(phoneNumber),
      message,
      detail,
      endpoint,
      metadata,
    });

    return res.status(201).json({
      message: 'Client error logged.',
      data: record,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to log client error.',
      error: error.message,
    });
  }
});

module.exports = router;
