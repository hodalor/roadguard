const DEFAULT_NOTIFICATION_CHANNEL_PROVIDERS = [
  {
    channel: 'email',
    providerKey: 'gmail_smtp',
    label: 'Gmail SMTP',
    isActive: false,
    priority: 1,
  },
  {
    channel: 'email',
    providerKey: 'console_log',
    label: 'Console Fallback',
    isActive: true,
    priority: 99,
  },
  {
    channel: 'sms',
    providerKey: 'africastalking',
    label: "Africa's Talking",
    isActive: false,
    priority: 1,
  },
  {
    channel: 'sms',
    providerKey: 'console_log',
    label: 'Console Fallback',
    isActive: true,
    priority: 99,
  },
];

function providerKeyOf(provider = {}) {
  return `${provider.channel}:${provider.providerKey}`;
}

function normalizeChannelProviders(providers = []) {
  const merged = new Map();

  for (const provider of DEFAULT_NOTIFICATION_CHANNEL_PROVIDERS) {
    merged.set(providerKeyOf(provider), { ...provider });
  }

  for (const provider of Array.isArray(providers) ? providers : []) {
    const normalized = {
      channel: provider.channel === 'sms' ? 'sms' : 'email',
      providerKey: String(provider.providerKey || '').trim(),
      label: String(provider.label || '').trim(),
      isActive: provider.isActive === true,
      priority: Number.isFinite(Number(provider.priority))
        ? Number(provider.priority)
        : 1,
    };

    if (!normalized.providerKey) {
      continue;
    }

    const key = providerKeyOf(normalized);
    const fallback = merged.get(key);
    merged.set(key, {
      ...(fallback || {}),
      ...normalized,
      label: normalized.label || fallback?.label || normalized.providerKey,
    });
  }

  return Array.from(merged.values()).sort((left, right) => {
    if (left.channel !== right.channel) {
      return left.channel.localeCompare(right.channel);
    }
    return Number(left.priority) - Number(right.priority);
  });
}

function mapNotificationChannelSettings(record) {
  return {
    singletonKey: record?.singletonKey || 'default',
    providers: normalizeChannelProviders(record?.providers || []),
    updatedAt: record?.updatedAt || null,
  };
}

module.exports = {
  DEFAULT_NOTIFICATION_CHANNEL_PROVIDERS,
  mapNotificationChannelSettings,
  normalizeChannelProviders,
};
