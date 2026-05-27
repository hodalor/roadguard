const { randomUUID } = require('crypto');

const store = {
  motorists: [],
  providers: [],
  sosEvents: [],
  sosSequence: 1000,
};

function createId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function createTicket() {
  store.sosSequence += 1;
  return `SOS-${store.sosSequence}`;
}

function upsertMotorist(data) {
  const index = store.motorists.findIndex(
    (motorist) => motorist.phoneNumber === data.phoneNumber
  );

  const nextRecord = {
    id: index >= 0 ? store.motorists[index].id : createId('motorist'),
    role: 'motorist',
    fullName: data.fullName,
    phoneNumber: data.phoneNumber,
    address: data.address,
    idType: data.idType,
    idNumber: data.idNumber,
    email: data.email || null,
    profileImageData: data.profileImageData,
    pin: data.pin || (index >= 0 ? store.motorists[index].pin : '1234'),
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    store.motorists[index] = {
      ...store.motorists[index],
      ...nextRecord,
    };
    return store.motorists[index];
  }

  const record = {
    ...nextRecord,
    createdAt: nextRecord.updatedAt,
  };

  store.motorists.push(record);
  return record;
}

function upsertProvider(data) {
  const index = store.providers.findIndex(
    (provider) => provider.phoneNumber === data.phoneNumber
  );

  const nextRecord = {
    id: index >= 0 ? store.providers[index].id : createId('provider'),
    fullName: data.fullName,
    businessName: data.businessName,
    phoneNumber: data.phoneNumber,
    address: data.address,
    email: data.email || null,
    idType: data.idType,
    idNumber: data.idNumber,
    profileImageData: data.profileImageData,
    pin: data.pin || (index >= 0 ? store.providers[index].pin : '1234'),
    shopImages: data.shopImages || [],
    serviceId: data.serviceId,
    serviceName: data.serviceName,
    serviceArea: data.serviceArea,
    currentLocation: data.currentLocation || {
      type: 'Point',
      coordinates: [0, 0],
    },
    currentLocationLabel: data.currentLocationLabel || '',
    currentLocationMapUrl: data.currentLocationMapUrl || '',
    availabilityStatus: data.availabilityStatus || 'available',
    approvalStatus: data.approvalStatus || 'approved',
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    store.providers[index] = {
      ...store.providers[index],
      ...nextRecord,
    };
    return store.providers[index];
  }

  const record = {
    ...nextRecord,
    createdAt: nextRecord.updatedAt,
  };

  store.providers.push(record);
  return record;
}

function updateProviderAvailability(providerId, availabilityStatus) {
  const index = store.providers.findIndex((provider) => provider.id === providerId);
  if (index === -1) {
    return null;
  }

  store.providers[index] = {
    ...store.providers[index],
    availabilityStatus,
    updatedAt: new Date().toISOString(),
  };

  return store.providers[index];
}

function createSosEvent(data) {
  const timestamp = new Date().toISOString();
  const record = {
    id: createId('sos'),
    ticket: createTicket(),
    requesterType: data.requesterType,
    userId: data.userId,
    requesterProviderId: data.requesterProviderId || null,
    requesterName: data.requesterName,
    requesterPhoneNumber: data.requesterPhoneNumber,
    emergencyType: data.emergencyType,
    requiredServiceId: data.requiredServiceId,
    requiredServiceName: data.requiredServiceName,
    locationLabel: data.locationLabel,
    location: data.location || {
      type: 'Point',
      coordinates: [0, 0],
    },
    note: data.note || '',
    status: 'awaiting_provider',
    assignedProviderId: null,
    assignedProviderName: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  store.sosEvents.unshift(record);
  return record;
}

function updateSosDecision(eventId, data) {
  const index = store.sosEvents.findIndex((event) => event.id === eventId);
  if (index === -1) {
    return null;
  }

  store.sosEvents[index] = {
    ...store.sosEvents[index],
    status: data.status,
    assignedProviderId: data.assignedProviderId,
    assignedProviderName: data.assignedProviderName,
    updatedAt: new Date().toISOString(),
  };

  return store.sosEvents[index];
}

module.exports = {
  store,
  createId,
  createTicket,
  upsertMotorist,
  upsertProvider,
  updateProviderAvailability,
  createSosEvent,
  updateSosDecision,
};
