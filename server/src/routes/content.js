const express = require('express');
const mongoose = require('mongoose');

const EmergencyContent = require('../models/EmergencyContent');
const { emergencyContent } = require('../data/adminData');

const router = express.Router();

function hasDatabaseConnection() {
  return mongoose.connection.readyState === 1;
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function mapContent(record, { adminView = false } = {}) {
  const id = String(record._id || record.id);
  const publishStatus = adminView
    ? toTitleCase(record.publishStatus || 'draft')
    : record.publishStatus || 'draft';

  return {
    id,
    contentCode: record.contentCode || `CNT-${id.slice(-5).toUpperCase()}`,
    title: record.title || '',
    category: record.category || '',
    content: record.content || '',
    version: record.version || '1.0.0',
    language: record.language || 'English',
    publishStatus,
    updatedAt: record.lastUpdated || record.updatedAt || record.createdAt || '',
    lastSync: record.updatedAt || record.lastUpdated || record.createdAt || '',
    notes: record.notes || '',
  };
}

router.get('/', async (req, res) => {
  const { adminView, publishStatus } = req.query;

  try {
    if (hasDatabaseConnection()) {
      const filters = {};
      if (adminView !== 'true') {
        filters.publishStatus = 'published';
      } else if (publishStatus) {
        filters.publishStatus = publishStatus;
      }

      const records = await EmergencyContent.find(filters).sort({ updatedAt: -1, createdAt: -1 });
      return res.json(records.map((record) => mapContent(record, { adminView: adminView === 'true' })));
    }

    let records = [...emergencyContent];
    if (adminView !== 'true') {
      records = records.filter(
        (item) => String(item.publishStatus).toLowerCase() === 'published'
      );
    } else if (publishStatus) {
      records = records.filter(
        (item) => String(item.publishStatus).toLowerCase() === publishStatus
      );
    }

    return res.json(records.map((record) => mapContent(record, { adminView: adminView === 'true' })));
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to load emergency guides.',
      error: error.message,
    });
  }
});

router.post('/', async (req, res) => {
  const { category, title, content, version, language, notes, publishStatus } = req.body;

  if (!category || !title || !content) {
    return res.status(400).json({
      message: 'category, title, and content are required.',
    });
  }

  try {
    if (hasDatabaseConnection()) {
      const record = await EmergencyContent.create({
        contentCode: `CNT-${Date.now().toString().slice(-6)}`,
        category,
        title,
        content,
        version: version || '1.0.0',
        language: language || 'English',
        notes: notes || '',
        publishStatus: publishStatus || 'draft',
        lastUpdated: new Date(),
      });

      return res.status(201).json({
        message: 'Emergency guide saved.',
        data: mapContent(record, { adminView: true }),
      });
    }

    const record = mapContent(
      {
        id: `cnt-${Date.now()}`,
        contentCode: `CNT-${Date.now().toString().slice(-6)}`,
        category,
        title,
        content,
        version: version || '1.0.0',
        language: language || 'English',
        notes: notes || '',
        publishStatus: publishStatus || 'draft',
        lastUpdated: new Date().toISOString(),
      },
      { adminView: true }
    );

    return res.status(201).json({
      message: 'Emergency guide saved.',
      data: record,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to save emergency guide.',
      error: error.message,
    });
  }
});

router.patch('/:id/status', async (req, res) => {
  const { publishStatus, notes } = req.body;

  if (!['published', 'draft'].includes(publishStatus)) {
    return res.status(400).json({
      message: 'publishStatus must be published or draft.',
    });
  }

  try {
    if (hasDatabaseConnection()) {
      const record = await EmergencyContent.findByIdAndUpdate(
        req.params.id,
        {
          publishStatus,
          lastUpdated: new Date(),
          ...(notes !== undefined ? { notes } : {}),
        },
        { new: true, runValidators: true }
      );

      if (!record) {
        return res.status(404).json({ message: 'Emergency guide not found.' });
      }

      return res.json({
        message: 'Emergency guide status updated.',
        data: mapContent(record, { adminView: true }),
      });
    }

    return res.status(503).json({
      message: 'Database connection is required for emergency guide publishing.',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to update emergency guide status.',
      error: error.message,
    });
  }
});

module.exports = router;
