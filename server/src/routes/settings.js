const express = require('express');
const mongoose = require('mongoose');

const NotificationChannelSettings = require('../models/NotificationChannelSettings');
const ServiceCatalog = require('../models/ServiceCatalog');
const { store } = require('../utils/mvpStore');
const {
  mapNotificationChannelSettings,
  normalizeChannelProviders,
} = require('../utils/notificationChannels');

const router = express.Router();

function hasDatabaseConnection() {
  return mongoose.connection.readyState === 1;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapService(record) {
  return {
    id: String(record._id || record.id),
    name: record.name,
    slug: record.slug,
    description: record.description || '',
    isActive: Boolean(record.isActive),
    status: record.isActive ? 'Active' : 'Inactive',
    createdAt: record.createdAt,
  };
}

router.get('/service-catalog', async (_req, res) => {
  if (!hasDatabaseConnection()) {
    return res.json([]);
  }

  try {
    const services = await ServiceCatalog.find().sort({ createdAt: -1 });
    return res.json(services.map(mapService));
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to load service catalog.',
      error: error.message,
    });
  }
});

router.post('/service-catalog', async (req, res) => {
  if (!hasDatabaseConnection()) {
    return res.status(503).json({
      message: 'Database connection is required to create services.',
    });
  }

  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({
      message: 'Service name is required.',
    });
  }

  const slug = slugify(name);
  if (!slug) {
    return res.status(400).json({
      message: 'Service name is invalid.',
    });
  }

  try {
    const existing = await ServiceCatalog.findOne({ slug });
    if (existing) {
      return res.status(409).json({
        message: 'A service with this name already exists.',
      });
    }

    const service = await ServiceCatalog.create({
      name: name.trim(),
      slug,
      description: description?.trim() || '',
    });

    return res.status(201).json({
      message: 'Service created successfully.',
      data: mapService(service),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to create service.',
      error: error.message,
    });
  }
});

router.patch('/service-catalog/:id', async (req, res) => {
  if (!hasDatabaseConnection()) {
    return res.status(503).json({
      message: 'Database connection is required to update services.',
    });
  }

  const { name, description, isActive } = req.body;
  const updates = {};

  if (typeof name === 'string' && name.trim()) {
    updates.name = name.trim();
    updates.slug = slugify(name);
  }
  if (typeof description === 'string') {
    updates.description = description.trim();
  }
  if (typeof isActive === 'boolean') {
    updates.isActive = isActive;
  }

  try {
    const service = await ServiceCatalog.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({
        message: 'Service not found.',
      });
    }

    return res.json({
      message: 'Service updated successfully.',
      data: mapService(service),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to update service.',
      error: error.message,
    });
  }
});

router.get('/notification-channels', async (_req, res) => {
  try {
    if (!hasDatabaseConnection()) {
      if (!store.notificationChannelSettings) {
        store.notificationChannelSettings = mapNotificationChannelSettings();
      }

      return res.json(store.notificationChannelSettings);
    }

    const record = await NotificationChannelSettings.findOneAndUpdate(
      { singletonKey: 'default' },
      { $setOnInsert: { singletonKey: 'default' } },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.json(mapNotificationChannelSettings(record));
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to load notification channels.',
      error: error.message,
    });
  }
});

router.patch('/notification-channels', async (req, res) => {
  const providers = normalizeChannelProviders(req.body?.providers || []);

  try {
    if (!hasDatabaseConnection()) {
      store.notificationChannelSettings = mapNotificationChannelSettings({
        singletonKey: 'default',
        providers,
        updatedAt: new Date().toISOString(),
      });

      return res.json({
        message: 'Notification channels updated.',
        data: store.notificationChannelSettings,
      });
    }

    const record = await NotificationChannelSettings.findOneAndUpdate(
      { singletonKey: 'default' },
      {
        singletonKey: 'default',
        providers,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );

    return res.json({
      message: 'Notification channels updated.',
      data: mapNotificationChannelSettings(record),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to update notification channels.',
      error: error.message,
    });
  }
});

module.exports = router;
