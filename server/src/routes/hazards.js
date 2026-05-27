const express = require('express');
const mongoose = require('mongoose');

const HazardReport = require('../models/HazardReport');
const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');
const { hazards } = require('../data/adminData');

const router = express.Router();

function hasDatabaseConnection() {
  return mongoose.connection.readyState === 1;
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function mapHazard(record, { adminView = false } = {}) {
  const id = String(record._id || record.id);
  const createdAt = record.createdAt || record.reportedAt || new Date().toISOString();
  const status = adminView ? toTitleCase(record.status || 'under_review') : record.status || 'under_review';
  const severity = adminView
    ? toTitleCase(record.severity || 'medium')
    : record.severity || 'medium';

  return {
    id,
    reportCode: record.reportCode || `HAZ-${id.slice(-5).toUpperCase()}`,
    hazardType: record.hazardType || '',
    location: record.locationLabel || record.location || '',
    locationLabel: record.locationLabel || record.location || '',
    locationMapUrl: record.locationMapUrl || '',
    severity,
    status,
    reporter: record.reporterName || record.reporter || 'Unknown reporter',
    reporterName: record.reporterName || record.reporter || 'Unknown reporter',
    confirmations: Number(record.confirmations || 0),
    reportedAt: createdAt,
    createdAt,
    expiresAt: record.expiresAt || '',
    notes: record.description || record.notes || '',
    description: record.description || record.notes || '',
    photoData: record.photoData || record.photoUrl || '',
  };
}

router.get('/', async (req, res) => {
  const { adminView, status } = req.query;

  try {
    if (hasDatabaseConnection()) {
      const filters = {};
      if (adminView !== 'true') {
        filters.status = 'active';
      } else if (status) {
        filters.status = status;
      }

      const records = await HazardReport.find(filters).sort({ createdAt: -1 });
      return res.json(records.map((record) => mapHazard(record, { adminView: adminView === 'true' })));
    }

    let records = [...hazards];
    if (adminView !== 'true') {
      records = records.filter((item) => String(item.status).toLowerCase() === 'active');
    } else if (status) {
      records = records.filter(
        (item) => String(item.status).toLowerCase().replace(/\s+/g, '_') === status
      );
    }

    return res.json(records.map((record) => mapHazard(record, { adminView: adminView === 'true' })));
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to load hazards.',
      error: error.message,
    });
  }
});

router.post('/', async (req, res) => {
  const {
    requesterType,
    userId,
    providerId,
    reporterName,
    hazardType,
    severity,
    description,
    locationLabel,
    locationMapUrl,
    photoData,
    location,
  } = req.body;

  if (!hazardType || !locationLabel) {
    return res.status(400).json({
      message: 'hazardType and locationLabel are required.',
    });
  }

  try {
    if (hasDatabaseConnection()) {
      const [motorist, provider] = await Promise.all([
        userId ? User.findById(userId) : null,
        providerId ? ServiceProvider.findById(providerId) : null,
      ]);

      const nextRecord = await HazardReport.create({
        reportCode: `HAZ-${Date.now().toString().slice(-6)}`,
        userId: requesterType === 'motorist' ? userId : undefined,
        requesterProviderId: requesterType === 'provider' ? providerId : undefined,
        reporterName:
          reporterName ||
          motorist?.fullName ||
          provider?.fullName ||
          provider?.businessName ||
          'RoadGuide user',
        hazardType,
        severity: severity || 'medium',
        description: description || '',
        locationLabel,
        locationMapUrl: locationMapUrl || '',
        photoData: photoData || '',
        location: {
          type: 'Point',
          coordinates: [
            Number(location?.longitude ?? 0),
            Number(location?.latitude ?? 0),
          ],
        },
        status: 'under_review',
        isActive: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      });

      return res.status(201).json({
        message: 'Hazard report submitted.',
        data: mapHazard(nextRecord, { adminView: true }),
      });
    }

    const record = mapHazard(
      {
        id: `haz-${Date.now()}`,
        reportCode: `HAZ-${Date.now().toString().slice(-6)}`,
        reporterName: reporterName || 'RoadGuide user',
        hazardType,
        severity: severity || 'medium',
        description: description || '',
        locationLabel,
        locationMapUrl: locationMapUrl || '',
        photoData: photoData || '',
        status: 'under_review',
        confirmations: 0,
        reportedAt: new Date().toISOString(),
      },
      { adminView: true }
    );

    return res.status(201).json({
      message: 'Hazard report submitted.',
      data: record,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to submit hazard report.',
      error: error.message,
    });
  }
});

router.patch('/:id/status', async (req, res) => {
  const { status, notes } = req.body;
  const isActive = status === 'active';

  if (!['active', 'under_review', 'resolved'].includes(status)) {
    return res.status(400).json({
      message: 'status must be active, under_review, or resolved.',
    });
  }

  try {
    if (hasDatabaseConnection()) {
      const record = await HazardReport.findByIdAndUpdate(
        req.params.id,
        {
          status,
          isActive,
          ...(notes !== undefined ? { description: notes } : {}),
        },
        { new: true, runValidators: true }
      );

      if (!record) {
        return res.status(404).json({ message: 'Hazard report not found.' });
      }

      return res.json({
        message: 'Hazard moderation updated.',
        data: mapHazard(record, { adminView: true }),
      });
    }

    return res.status(503).json({
      message: 'Database connection is required for hazard moderation.',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to update hazard moderation.',
      error: error.message,
    });
  }
});

module.exports = router;
