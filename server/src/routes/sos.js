const express = require('express');
const mongoose = require('mongoose');

const SosEvent = require('../models/SosEvent');
const User = require('../models/User');
const ServiceProvider = require('../models/ServiceProvider');
const ServiceCatalog = require('../models/ServiceCatalog');
const { store, createSosEvent, createTicket } = require('../utils/mvpStore');

const router = express.Router();

const RING_DURATION_MS = 30 * 1000;
const ACTIVE_REQUEST_STATUSES = ['awaiting_provider', 'accepted_by_provider', 'transferred'];

function hasDatabaseConnection() {
  return mongoose.connection.readyState === 1;
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function objectIdString(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object' && value._id) {
    return String(value._id);
  }

  return String(value);
}

function isValidCoordinate(value) {
  return Number.isFinite(Number(value));
}

function buildMapUrl(latitude, longitude) {
  if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
    return '';
  }

  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function buildGeoPoint(location = {}) {
  const latitude = Number(location.latitude ?? NaN);
  const longitude = Number(location.longitude ?? NaN);

  return {
    type: 'Point',
    coordinates: [
      Number.isFinite(longitude) ? longitude : 0,
      Number.isFinite(latitude) ? latitude : 0,
    ],
  };
}

function canProviderViewEvent(event, provider) {
  const providerId = objectIdString(provider?._id || provider?.id);
  if (!providerId || !provider) {
    return false;
  }

  if (String(event.status) === 'cancelled' || String(event.status) === 'resolved') {
    return false;
  }

  const requiredServiceId = objectIdString(event.requiredServiceId);
  if (requiredServiceId && String(requiredServiceId) !== String(provider.serviceId)) {
    return false;
  }

  const assignedProviderId = objectIdString(event.assignedProviderId);
  if (assignedProviderId === providerId) {
    return true;
  }

  const currentNotifiedProviderId = objectIdString(event.currentNotifiedProviderId);
  if (currentNotifiedProviderId === providerId) {
    return true;
  }

  return event.allowProviderOffers === true || !currentNotifiedProviderId;
}

function mapOffer(offer) {
  return {
    providerId: objectIdString(offer.providerId),
    providerName: offer.providerName || '',
    message: offer.message || '',
    createdAt: offer.createdAt,
  };
}

function mapSosRecord(event, { adminView = false } = {}) {
  const motorist = event.userId && typeof event.userId === 'object' ? event.userId : null;
  const requesterProvider =
    event.requesterProviderId && typeof event.requesterProviderId === 'object'
      ? event.requesterProviderId
      : null;
  const provider =
    event.assignedProviderId && typeof event.assignedProviderId === 'object'
      ? event.assignedProviderId
      : null;
  const currentProvider =
    event.currentNotifiedProviderId && typeof event.currentNotifiedProviderId === 'object'
      ? event.currentNotifiedProviderId
      : null;
  const directProvider =
    event.directProviderId && typeof event.directProviderId === 'object'
      ? event.directProviderId
      : null;
  const status = adminView ? toTitleCase(event.status) : event.status;

  return {
    id: String(event._id || event.id),
    ticket: event.ticket || String(event._id || event.id),
    requesterType: event.requesterType,
    userId: motorist ? String(motorist._id) : objectIdString(event.userId),
    providerRequesterId: requesterProvider
      ? String(requesterProvider._id)
      : objectIdString(event.requesterProviderId),
    requesterName:
      motorist?.fullName ||
      requesterProvider?.fullName ||
      event.requesterName ||
      'Unknown requester',
    requesterPhoneNumber:
      motorist?.phoneNumber ||
      requesterProvider?.phoneNumber ||
      event.requesterPhoneNumber ||
      '',
    emergencyType: event.emergencyType,
    requiredServiceId: objectIdString(event.requiredServiceId),
    requiredServiceType: event.requiredServiceName,
    requiredServiceName: event.requiredServiceName,
    locationLabel: event.locationLabel || '',
    addressString: event.locationLabel || '',
    locationMapUrl: event.locationMapUrl || '',
    note: event.note || '',
    requestImages: Array.isArray(event.requestImages) ? event.requestImages : [],
    requestImagesCount: Array.isArray(event.requestImages) ? event.requestImages.length : 0,
    status,
    assignedProviderId: provider
      ? String(provider._id)
      : objectIdString(event.assignedProviderId),
    assignedProviderName: provider?.businessName || event.assignedProviderName || null,
    directProviderId: directProvider
      ? String(directProvider._id)
      : objectIdString(event.directProviderId),
    directProviderName: directProvider?.businessName || event.directProviderName || null,
    currentNotifiedProviderId: currentProvider
      ? String(currentProvider._id)
      : objectIdString(event.currentNotifiedProviderId),
    currentNotifiedProviderName:
      currentProvider?.businessName || event.currentNotifiedProviderName || null,
    ringExpiresAt: event.ringExpiresAt,
    allowProviderOffers: event.allowProviderOffers === true,
    providerOffers: Array.isArray(event.providerOffers)
      ? event.providerOffers.map(mapOffer)
      : [],
    createdAt: event.createdAt,
    motorist: adminView
      ? motorist?.fullName || event.requesterName || 'Unknown requester'
      : undefined,
    requester: adminView ? toTitleCase(event.requesterType) : undefined,
    location: adminView ? event.locationLabel || '' : undefined,
    assignedProvider: adminView
      ? provider?.businessName || event.assignedProviderName || 'Pending'
      : undefined,
  };
}

async function setNextDispatchProvider(event, startIndex = 0) {
  const queue = Array.isArray(event.dispatchQueue) ? event.dispatchQueue : [];
  const now = new Date();

  for (let index = startIndex; index < queue.length; index += 1) {
    const providerId = objectIdString(queue[index]);
    if (!providerId) {
      continue;
    }

    const provider = await ServiceProvider.findById(providerId).select(
      'businessName approvalStatus availabilityStatus serviceId'
    );

    if (!provider) {
      continue;
    }

    if (provider.approvalStatus !== 'approved' || provider.availabilityStatus !== 'available') {
      continue;
    }

    event.currentDispatchIndex = index;
    event.currentNotifiedProviderId = provider._id;
    event.currentNotifiedProviderName = provider.businessName;
    event.ringStartedAt = now;
    event.ringExpiresAt = new Date(now.getTime() + RING_DURATION_MS);
    return true;
  }

  event.currentDispatchIndex = queue.length;
  event.currentNotifiedProviderId = null;
  event.currentNotifiedProviderName = null;
  event.ringStartedAt = null;
  event.ringExpiresAt = null;
  event.allowProviderOffers = true;
  return false;
}

async function advanceExpiredDispatches() {
  if (!hasDatabaseConnection()) {
    return;
  }

  const now = new Date();
  const expiredEvents = await SosEvent.find({
    status: 'awaiting_provider',
    currentNotifiedProviderId: { $ne: null },
    ringExpiresAt: { $lte: now },
  });

  for (const event of expiredEvents) {
    if (event.directProviderId && event.currentDispatchIndex === 0) {
      event.allowProviderOffers = true;
    }

    await setNextDispatchProvider(event, Number(event.currentDispatchIndex || 0) + 1);
    await event.save();
  }
}

async function findCandidateProviders({
  serviceId,
  latitude,
  longitude,
  excludeProviderId,
  directProviderId,
}) {
  const query = {
    serviceId,
    approvalStatus: 'approved',
    availabilityStatus: 'available',
  };

  if (excludeProviderId) {
    query._id = { $ne: excludeProviderId };
  }

  let providers = [];
  if (isValidCoordinate(latitude) && isValidCoordinate(longitude)) {
    const records = await ServiceProvider.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [Number(longitude), Number(latitude)],
          },
          distanceField: 'distanceMeters',
          spherical: true,
          query,
        },
      },
      { $sort: { distanceMeters: 1, createdAt: -1 } },
      { $limit: 30 },
    ]);

    providers = records.map((record) => String(record._id));
  } else {
    const records = await ServiceProvider.find(query).sort({ createdAt: -1 }).limit(30);
    providers = records.map((record) => String(record._id));
  }

  if (!directProviderId) {
    return providers;
  }

  const directProvider = await ServiceProvider.findOne({
    _id: directProviderId,
    serviceId,
    approvalStatus: 'approved',
    availabilityStatus: 'available',
  }).select('_id');

  if (!directProvider) {
    return providers;
  }

  return [
    String(directProvider._id),
    ...providers.filter((providerId) => providerId !== String(directProvider._id)),
  ];
}

router.get('/mvp', async (req, res) => {
  const { status, serviceId, userId, providerId, viewerProviderId } = req.query;

  try {
    if (hasDatabaseConnection()) {
      await advanceExpiredDispatches();

      const filters = {};
      if (status) {
        filters.status = status;
      }
      if (serviceId) {
        filters.requiredServiceId = serviceId;
      }
      if (userId) {
        filters.userId = userId;
      }
      if (providerId) {
        filters.requesterProviderId = providerId;
      }

      const [events, viewerProvider] = await Promise.all([
        SosEvent.find(filters)
          .populate('userId', 'fullName phoneNumber address')
          .populate('requesterProviderId', 'fullName businessName phoneNumber')
          .populate('assignedProviderId', 'businessName')
          .populate('currentNotifiedProviderId', 'businessName')
          .populate('directProviderId', 'businessName')
          .populate('requiredServiceId', 'name')
          .sort({ createdAt: -1 }),
        viewerProviderId ? ServiceProvider.findById(viewerProviderId) : null,
      ]);

      const visibleEvents = viewerProvider
        ? events.filter((event) => canProviderViewEvent(event, viewerProvider))
        : events;

      return res.json(visibleEvents.map(mapSosRecord));
    }

    let events = [...store.sosEvents];
    if (status) {
      events = events.filter((event) => event.status === status);
    }
    if (serviceId) {
      events = events.filter((event) => event.requiredServiceId === serviceId);
    }
    if (userId) {
      events = events.filter((event) => event.userId === userId);
    }
    if (providerId) {
      events = events.filter((event) => event.requesterProviderId === providerId);
    }

    return res.json(events);
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to load SOS requests.',
      error: error.message,
    });
  }
});

router.get('/', async (_req, res) => {
  try {
    if (hasDatabaseConnection()) {
      await advanceExpiredDispatches();

      const events = await SosEvent.find()
        .populate('userId', 'fullName phoneNumber address')
        .populate('requesterProviderId', 'fullName businessName phoneNumber')
        .populate('assignedProviderId', 'businessName')
        .populate('currentNotifiedProviderId', 'businessName')
        .populate('directProviderId', 'businessName')
        .sort({ createdAt: -1 });

      return res.json(events.map((event) => mapSosRecord(event, { adminView: true })));
    }

    return res.json(store.sosEvents.map((event) => mapSosRecord(event, { adminView: true })));
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to load SOS requests.',
      error: error.message,
    });
  }
});

router.post('/', async (req, res) => {
  const {
    requesterType,
    userId,
    providerId,
    emergencyType,
    serviceId,
    locationLabel,
    note,
    location,
    locationMapUrl,
    requestImages,
    directProviderId,
  } = req.body;

  if (!requesterType || !emergencyType || !serviceId || !locationLabel) {
    return res.status(400).json({
      message:
        'requesterType, emergencyType, serviceId, and locationLabel are required.',
    });
  }

  if (!['motorist', 'provider'].includes(requesterType)) {
    return res.status(400).json({
      message: 'requesterType must be motorist or provider.',
    });
  }

  try {
    if (hasDatabaseConnection()) {
      const [service, motorist, requesterProvider] = await Promise.all([
        ServiceCatalog.findById(serviceId),
        requesterType === 'motorist' && userId ? User.findById(userId) : null,
        requesterType === 'provider' && providerId
          ? ServiceProvider.findById(providerId)
          : null,
      ]);

      if (!service || !service.isActive) {
        return res.status(400).json({ message: 'Requested service is not available.' });
      }
      if (requesterType === 'motorist' && !motorist) {
        return res.status(404).json({ message: 'Motorist not found.' });
      }
      if (requesterType === 'provider' && !requesterProvider) {
        return res.status(404).json({ message: 'Provider account not found.' });
      }

      const duplicateFilter = {
        requiredServiceId: service._id,
        status: { $in: ACTIVE_REQUEST_STATUSES },
        ...(requesterType === 'motorist'
          ? { userId }
          : { requesterProviderId: providerId }),
      };
      const activeRequest = await SosEvent.findOne(duplicateFilter).select('_id');
      if (activeRequest) {
        return res.status(400).json({
          message:
            'Cancel or complete the current request for this service before creating another one.',
        });
      }

      const point = buildGeoPoint(location);
      const latitude = point.coordinates[1];
      const longitude = point.coordinates[0];
      const queue = await findCandidateProviders({
        serviceId: service._id,
        latitude,
        longitude,
        excludeProviderId: requesterType === 'provider' ? requesterProvider._id : null,
        directProviderId,
      });

      const event = await SosEvent.create({
        ticket: createTicket(),
        requesterType,
        userId: requesterType === 'motorist' ? userId : undefined,
        requesterProviderId: requesterType === 'provider' ? providerId : undefined,
        requesterName:
          requesterType === 'motorist' ? motorist.fullName : requesterProvider.fullName,
        requesterPhoneNumber:
          requesterType === 'motorist'
            ? motorist.phoneNumber
            : requesterProvider.phoneNumber,
        emergencyType,
        requiredServiceId: service._id,
        requiredServiceName: service.name,
        requestImages: Array.isArray(requestImages) ? requestImages : [],
        locationLabel,
        locationMapUrl:
          locationMapUrl || buildMapUrl(latitude, longitude) || '',
        note: note || '',
        location: point,
        directProviderId: directProviderId || undefined,
        dispatchQueue: queue,
        allowProviderOffers: queue.length === 0,
      });

      if (directProviderId) {
        const directProvider = await ServiceProvider.findById(directProviderId).select(
          'businessName'
        );
        if (directProvider) {
          event.directProviderName = directProvider.businessName;
        }
      }

      if (queue.length > 0) {
        await setNextDispatchProvider(event, 0);
      }

      await event.save();
      await event.populate('userId', 'fullName phoneNumber address');
      await event.populate('requesterProviderId', 'fullName businessName phoneNumber');
      await event.populate('requiredServiceId', 'name');
      await event.populate('currentNotifiedProviderId', 'businessName');
      await event.populate('directProviderId', 'businessName');

      return res.status(201).json({
        message: 'Emergency request created.',
        data: mapSosRecord(event),
      });
    }

    const requester =
      requesterType === 'motorist'
        ? store.motorists.find((item) => item.id === userId)
        : store.providers.find((item) => item.id === providerId);

    if (!requester) {
      return res.status(404).json({ message: 'Requester account not found.' });
    }

    const existingEvent = store.sosEvents.find(
      (event) =>
        event.requiredServiceId === serviceId &&
        (requesterType === 'motorist'
          ? event.userId === userId
          : event.requesterProviderId === providerId) &&
        ACTIVE_REQUEST_STATUSES.includes(event.status)
    );

    if (existingEvent) {
      return res.status(400).json({
        message:
          'Cancel or complete the current request for this service before creating another one.',
      });
    }

    const event = createSosEvent({
      requesterType,
      userId: requesterType === 'motorist' ? userId : null,
      requesterProviderId: requesterType === 'provider' ? providerId : null,
      requesterName: requester.fullName || requester.businessName,
      requesterPhoneNumber: requester.phoneNumber,
      emergencyType,
      requiredServiceId: serviceId,
      requiredServiceName: req.body.requiredServiceName || 'Requested service',
      requestImages: Array.isArray(requestImages) ? requestImages : [],
      locationLabel,
      locationMapUrl:
        locationMapUrl ||
        buildMapUrl(location?.latitude, location?.longitude) ||
        '',
      location: buildGeoPoint(location),
      note,
      directProviderId: directProviderId || null,
      directProviderName: null,
      dispatchQueue: [],
      currentDispatchIndex: 0,
      currentNotifiedProviderId: null,
      currentNotifiedProviderName: null,
      ringStartedAt: null,
      ringExpiresAt: null,
      allowProviderOffers: true,
      providerOffers: [],
    });

    return res.status(201).json({
      message: 'Emergency request created.',
      data: event,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to create emergency request.',
      error: error.message,
    });
  }
});

router.patch('/:id/cancel', async (req, res) => {
  const { userId, providerId } = req.body;

  try {
    if (hasDatabaseConnection()) {
      const event = await SosEvent.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: 'Emergency request not found.' });
      }

      const requesterMatches =
        (userId && String(event.userId || '') === String(userId)) ||
        (providerId &&
          String(event.requesterProviderId || '') === String(providerId));

      if (!requesterMatches) {
        return res.status(403).json({
          message: 'Only the requester can cancel this emergency request.',
        });
      }

      event.status = 'cancelled';
      event.cancelled = true;
      event.currentNotifiedProviderId = null;
      event.currentNotifiedProviderName = null;
      event.ringStartedAt = null;
      event.ringExpiresAt = null;
      await event.save();

      return res.json({
        message: 'Emergency request cancelled.',
        data: mapSosRecord(event),
      });
    }

    const event = store.sosEvents.find((item) => item.id === req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Emergency request not found.' });
    }

    event.status = 'cancelled';
    event.cancelled = true;
    return res.json({
      message: 'Emergency request cancelled.',
      data: event,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to cancel emergency request.',
      error: error.message,
    });
  }
});

router.post('/:id/offers', async (req, res) => {
  const { providerId, message } = req.body;

  if (!providerId) {
    return res.status(400).json({
      message: 'providerId is required.',
    });
  }

  try {
    if (hasDatabaseConnection()) {
      const [event, provider] = await Promise.all([
        SosEvent.findById(req.params.id),
        ServiceProvider.findById(providerId),
      ]);

      if (!event) {
        return res.status(404).json({ message: 'Emergency request not found.' });
      }
      if (!provider) {
        return res.status(404).json({ message: 'Provider not found.' });
      }
      if (!canProviderViewEvent(event, provider)) {
        return res.status(403).json({
          message: 'This request is not available to this provider.',
        });
      }

      event.providerOffers = (event.providerOffers || []).filter(
        (offer) => String(offer.providerId) !== String(provider._id)
      );
      event.providerOffers.push({
        providerId: provider._id,
        providerName: provider.businessName,
        message:
          message ||
          `Provider ${provider.businessName} can help with request ${event.ticket}.`,
      });
      event.allowProviderOffers = true;
      await event.save();

      return res.status(201).json({
        message: 'Provider offer sent to the requester.',
        data: mapSosRecord(event),
      });
    }

    return res.status(503).json({
      message: 'Database connection is required for provider offers.',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to create provider offer.',
      error: error.message,
    });
  }
});

router.patch('/:id/transfer', async (req, res) => {
  const { userId, providerId } = req.body;

  if (!providerId || !userId) {
    return res.status(400).json({
      message: 'userId and providerId are required.',
    });
  }

  try {
    if (hasDatabaseConnection()) {
      const [event, provider] = await Promise.all([
        SosEvent.findById(req.params.id),
        ServiceProvider.findById(providerId),
      ]);

      if (!event) {
        return res.status(404).json({ message: 'Emergency request not found.' });
      }
      if (!provider) {
        return res.status(404).json({ message: 'Provider not found.' });
      }
      if (String(event.userId || '') !== String(userId)) {
        return res.status(403).json({
          message: 'Only the motorist requester can transfer this request.',
        });
      }

      const queueIds = [
        String(provider._id),
        ...((event.dispatchQueue || []).map((item) => String(item)).filter(
          (item) => item !== String(provider._id)
        )),
      ];

      event.directProviderId = provider._id;
      event.directProviderName = provider.businessName;
      event.dispatchQueue = queueIds;
      event.currentDispatchIndex = 0;
      event.status = 'transferred';
      event.allowProviderOffers = false;
      await setNextDispatchProvider(event, 0);
      event.status = 'awaiting_provider';
      await event.save();
      await event.populate('directProviderId', 'businessName');
      await event.populate('currentNotifiedProviderId', 'businessName');

      return res.json({
        message: 'Emergency request transferred to the selected provider.',
        data: mapSosRecord(event),
      });
    }

    return res.status(503).json({
      message: 'Database connection is required for request transfer.',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to transfer emergency request.',
      error: error.message,
    });
  }
});

router.patch('/:id/provider-response', async (req, res) => {
  const { providerId, decision } = req.body;

  if (!providerId || !decision) {
    return res.status(400).json({
      message: 'providerId and decision are required.',
    });
  }

  if (!['accept', 'reject'].includes(decision)) {
    return res.status(400).json({
      message: 'decision must be accept or reject.',
    });
  }

  try {
    if (hasDatabaseConnection()) {
      await advanceExpiredDispatches();

      const [event, provider] = await Promise.all([
        SosEvent.findById(req.params.id).populate('userId', 'fullName phoneNumber address'),
        ServiceProvider.findById(providerId),
      ]);

      if (!event) {
        return res.status(404).json({ message: 'Emergency request not found.' });
      }
      if (!provider) {
        return res.status(404).json({ message: 'Provider not found.' });
      }
      if (String(provider.serviceId) !== String(event.requiredServiceId)) {
        return res.status(400).json({
          message: 'Provider service does not match this request.',
        });
      }
      if (provider.approvalStatus !== 'approved') {
        return res.status(400).json({
          message: 'Provider profile is still pending approval.',
        });
      }

      const isCurrentProvider =
        String(event.currentNotifiedProviderId || '') === String(provider._id);
      if (!isCurrentProvider && !event.allowProviderOffers) {
        return res.status(403).json({
          message: 'This request is currently ringing another provider.',
        });
      }

      if (decision === 'accept') {
        event.status = 'accepted_by_provider';
        event.assignedProviderId = provider._id;
        event.assignedProviderName = provider.businessName;
        event.currentNotifiedProviderId = null;
        event.currentNotifiedProviderName = null;
        event.ringStartedAt = null;
        event.ringExpiresAt = null;
        await event.save();
        await event.populate('assignedProviderId', 'businessName');

        return res.json({
          message: 'Emergency request accepted.',
          data: mapSosRecord(event),
        });
      }

      event.assignedProviderId = null;
      event.assignedProviderName = null;
      if (isCurrentProvider) {
        await setNextDispatchProvider(event, Number(event.currentDispatchIndex || 0) + 1);
      } else {
        event.allowProviderOffers = true;
      }
      await event.save();

      return res.json({
        message:
          event.currentNotifiedProviderId
            ? 'Emergency request rejected and moved to the next provider.'
            : 'Emergency request left open for other providers.',
        data: mapSosRecord(event),
      });
    }

    return res.status(503).json({
      message: 'Database connection is required for provider responses.',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to update emergency request.',
      error: error.message,
    });
  }
});

module.exports = router;
