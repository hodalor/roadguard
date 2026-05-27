const express = require('express');
const mongoose = require('mongoose');

const ServiceProvider = require('../models/ServiceProvider');
const ServiceCatalog = require('../models/ServiceCatalog');
const {
  store,
  upsertProvider,
  updateProviderAvailability,
} = require('../utils/mvpStore');

const router = express.Router();

function hasDatabaseConnection() {
  return mongoose.connection.readyState === 1;
}

function toTitleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toObjectId(value) {
  return new mongoose.Types.ObjectId(String(value));
}

function isValidPin(pin) {
  return /^\d{4}$/.test(String(pin || ''));
}

function mapProvider(provider, { adminView = false } = {}) {
  const id = String(provider._id || provider.id);
  const availabilityStatus = adminView
    ? toTitleCase(provider.availabilityStatus)
    : provider.availabilityStatus;
  const approvalStatus = adminView
    ? toTitleCase(provider.approvalStatus)
    : provider.approvalStatus;

  return {
    id,
    providerCode: `PROV-${id.slice(-5).toUpperCase()}`,
    fullName: provider.fullName,
    businessName: provider.businessName,
    phoneNumber: provider.phoneNumber,
    phone: provider.phoneNumber,
    address: provider.address,
    email: provider.email || null,
    idType: provider.idType,
    idNumber: provider.idNumber,
    profileImageData: provider.profileImageData || '',
    shopImages: Array.isArray(provider.shopImages) ? provider.shopImages : [],
    serviceId: String(provider.serviceId?._id || provider.serviceId || ''),
    serviceType: provider.serviceName || provider.serviceType || '',
    serviceName: provider.serviceName || provider.serviceType || '',
    serviceArea: provider.serviceArea || provider.address,
    coverage: provider.serviceArea || provider.address,
    currentLocationLabel: provider.currentLocationLabel || '',
    currentLocationMapUrl: provider.currentLocationMapUrl || '',
    coordinates: Array.isArray(provider.currentLocation?.coordinates)
      ? {
          longitude: Number(provider.currentLocation.coordinates[0] ?? 0),
          latitude: Number(provider.currentLocation.coordinates[1] ?? 0),
        }
      : null,
    distanceKm:
      provider.distanceKm !== undefined && provider.distanceKm !== null
        ? Number(provider.distanceKm)
        : null,
    availabilityStatus,
    approvalStatus,
    verificationStatus: approvalStatus,
    rating: provider.rating ?? 0,
    profileImageReady: provider.profileImageData ? 'Yes' : 'No',
    shopImagesCount: Array.isArray(provider.shopImages) ? provider.shopImages.length : 0,
    createdAt: provider.createdAt,
  };
}

async function findNearbyProviders({ serviceId, latitude, longitude, excludeProviderId }) {
  const pipeline = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [Number(longitude), Number(latitude)],
        },
        distanceField: 'distanceMeters',
        spherical: true,
        query: {
          availabilityStatus: 'available',
          approvalStatus: 'approved',
          ...(serviceId ? { serviceId: toObjectId(serviceId) } : {}),
          ...(excludeProviderId
            ? { _id: { $ne: toObjectId(excludeProviderId) } }
            : {}),
        },
      },
    },
    { $sort: { distanceMeters: 1, createdAt: -1 } },
    { $limit: 30 },
  ];

  const records = await ServiceProvider.aggregate(pipeline);
  return records.map((record) => ({
    ...record,
    distanceKm: Number((Number(record.distanceMeters || 0) / 1000).toFixed(2)),
  }));
}

router.get('/nearby', async (req, res) => {
  const { serviceId, latitude, longitude, excludeProviderId } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({
      message: 'latitude and longitude are required.',
    });
  }

  try {
    if (hasDatabaseConnection()) {
      const providers = await findNearbyProviders({
        serviceId,
        latitude,
        longitude,
        excludeProviderId,
      });
      return res.json(providers.map((provider) => mapProvider(provider)));
    }

    const candidates = store.providers
      .filter((provider) => provider.availabilityStatus === 'available')
      .filter((provider) => provider.approvalStatus === 'approved')
      .filter((provider) => (!serviceId ? true : provider.serviceId === serviceId))
      .filter((provider) => (!excludeProviderId ? true : provider.id !== excludeProviderId))
      .map((provider) => {
        const coordinates = provider.currentLocation?.coordinates || [0, 0];
        const distanceKm = Math.sqrt(
          (Number(coordinates[0] || 0) - Number(longitude)) ** 2 +
            (Number(coordinates[1] || 0) - Number(latitude)) ** 2
        );
        return {
          ...provider,
          distanceKm: Number(distanceKm.toFixed(2)),
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 30);

    return res.json(candidates.map((provider) => mapProvider(provider)));
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to load nearby providers.',
      error: error.message,
    });
  }
});

router.get('/mvp', async (req, res) => {
  const { serviceId } = req.query;

  try {
    if (hasDatabaseConnection()) {
      const filters = { approvalStatus: 'approved' };
      if (serviceId) {
        filters.serviceId = serviceId;
      }

      const records = await ServiceProvider.find(filters)
        .populate('serviceId', 'name')
        .sort({ createdAt: -1 });
      return res.json(records.map((record) => mapProvider(record)));
    }

    const records = (serviceId
      ? store.providers.filter((provider) => provider.serviceId === serviceId)
      : store.providers
    ).filter((provider) => provider.approvalStatus === 'approved');

    return res.json(records.map((record) => mapProvider(record)));
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to load service providers.',
      error: error.message,
    });
  }
});

router.patch('/:id/approval', async (req, res) => {
  const { approvalStatus } = req.body;

  if (!['approved', 'rejected', 'pending'].includes(approvalStatus)) {
    return res.status(400).json({
      message: 'approvalStatus must be approved, rejected, or pending.',
    });
  }

  try {
    if (hasDatabaseConnection()) {
      const provider = await ServiceProvider.findByIdAndUpdate(
        req.params.id,
        { approvalStatus },
        { new: true, runValidators: true }
      ).populate('serviceId', 'name');

      if (!provider) {
        return res.status(404).json({ message: 'Provider not found.' });
      }

      return res.json({
        message: 'Provider approval updated.',
        data: mapProvider(provider, { adminView: true }),
      });
    }

    const index = store.providers.findIndex((provider) => provider.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: 'Provider not found.' });
    }

    store.providers[index] = {
      ...store.providers[index],
      approvalStatus,
      updatedAt: new Date().toISOString(),
    };

    return res.json({
      message: 'Provider approval updated.',
      data: mapProvider(store.providers[index], { adminView: true }),
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to update provider approval.',
      error: error.message,
    });
  }
});

router.post('/register', async (req, res) => {
  const {
    fullName,
    businessName,
    phoneNumber,
    address,
    email,
    idType,
    idNumber,
    profileImageData,
    shopImages,
    serviceId,
    serviceArea,
    currentLocation,
    currentLocationLabel,
    currentLocationMapUrl,
    pin,
  } = req.body;

  if (
    !fullName ||
    !businessName ||
    !phoneNumber ||
    !address ||
    !idType ||
    !idNumber ||
    !profileImageData ||
    !serviceId ||
    !serviceArea
  ) {
    return res.status(400).json({
      message:
        'fullName, businessName, phoneNumber, address, idType, idNumber, profileImageData, serviceId, and serviceArea are required.',
    });
  }

  if (!Array.isArray(shopImages) || shopImages.length < 3) {
    return res.status(400).json({
      message: 'At least three shop images are required.',
    });
  }

  if (pin !== undefined && !isValidPin(pin)) {
    return res.status(400).json({
      message: 'pin must be exactly 4 digits.',
    });
  }

  try {
    let serviceName = req.body.serviceName || '';

    if (hasDatabaseConnection()) {
      const existingProvider = await ServiceProvider.findOne({ phoneNumber });
      const service = await ServiceCatalog.findById(serviceId);
      if (!service || !service.isActive) {
        return res.status(400).json({
          message: 'Selected provider service is not available.',
        });
      }
      serviceName = service.name;

      const provider = await ServiceProvider.findOneAndUpdate(
        { phoneNumber },
        {
          fullName,
          businessName,
          phoneNumber,
          address,
          email: email || undefined,
          idType,
          idNumber,
          profileImageData,
          shopImages,
          serviceId: service._id,
          serviceName,
          serviceArea,
          currentLocation: {
            type: 'Point',
            coordinates: [
              Number(currentLocation?.longitude ?? 0),
              Number(currentLocation?.latitude ?? 0),
            ],
          },
          currentLocationLabel: currentLocationLabel || undefined,
          currentLocationMapUrl: currentLocationMapUrl || undefined,
          pin: pin || existingProvider?.pin || '1234',
          availabilityStatus: 'available',
          approvalStatus: 'pending',
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      );

      await provider.populate('serviceId', 'name');

      return res.status(201).json({
        message: 'Service provider registered.',
        data: mapProvider(provider),
      });
    }

    const provider = upsertProvider({
      fullName,
      businessName,
      phoneNumber,
      address,
      email,
      idType,
      idNumber,
      profileImageData,
      shopImages,
      serviceId,
      serviceName,
      serviceArea,
      currentLocation: {
        type: 'Point',
        coordinates: [
          Number(currentLocation?.longitude ?? 0),
          Number(currentLocation?.latitude ?? 0),
        ],
      },
      currentLocationLabel,
      currentLocationMapUrl,
      pin,
      availabilityStatus: 'available',
      approvalStatus: 'pending',
    });

    return res.status(201).json({
      message: 'Service provider registered.',
      data: provider,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to register service provider.',
      error: error.message,
    });
  }
});

router.patch('/:id/availability', async (req, res) => {
  const { availabilityStatus } = req.body;

  if (!['available', 'offline', 'busy'].includes(availabilityStatus)) {
    return res.status(400).json({
      message: 'availabilityStatus must be available, busy, or offline.',
    });
  }

  try {
    if (hasDatabaseConnection()) {
      const provider = await ServiceProvider.findByIdAndUpdate(
        req.params.id,
        { availabilityStatus },
        { new: true, runValidators: true }
      );

      if (!provider) {
        return res.status(404).json({ message: 'Provider not found.' });
      }

      return res.json({
        message: 'Provider availability updated.',
        data: mapProvider(provider),
      });
    }

    const provider = updateProviderAvailability(req.params.id, availabilityStatus);
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found.' });
    }

    return res.json({
      message: 'Provider availability updated.',
      data: provider,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to update provider availability.',
      error: error.message,
    });
  }
});

router.get('/', (_req, res) => {
  return (async () => {
    try {
      if (hasDatabaseConnection()) {
        const records = await ServiceProvider.find()
          .populate('serviceId', 'name')
          .sort({ createdAt: -1 });
        return res.json(records.map((record) => mapProvider(record, { adminView: true })));
      }

      return res.json(store.providers.map((record) => mapProvider(record, { adminView: true })));
    } catch (error) {
      return res.status(500).json({
        message: 'Unable to load providers.',
        error: error.message,
      });
    }
  })();
});

module.exports = router;
