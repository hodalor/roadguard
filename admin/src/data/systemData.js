export const navigationItems = [
  { id: 'overview', label: 'Overview', path: '/' },
  { id: 'motorists', label: 'Motorists', path: '/motorists' },
  { id: 'sos', label: 'SOS Requests', path: '/sos' },
  { id: 'providers', label: 'Providers', path: '/providers' },
  { id: 'hazards', label: 'Hazards', path: '/hazards' },
  { id: 'guides', label: 'Emergency Guides', path: '/guides' },
  { id: 'settings', label: 'Settings', path: '/settings' },
];

export const dashboardStats = [
  { label: 'SOS Requests', value: '0', accent: '#ff6a00' },
  { label: 'Active Providers', value: '0', accent: '#22c55e' },
  { label: 'Motorists', value: '0', accent: '#2563eb' },
  { label: 'Services', value: '0', accent: '#a855f7' },
];

export const sosRequests = [];

export const providers = [];

export const hazards = [];

export const emergencyContacts = [];

export const emergencyContent = [];

export const emergencyServices = [];

export const analytics = {
  metrics: [],
  insights: [],
};

export const overviewActivities = [
  'Accounts, provider services, and SOS requests now come from MongoDB.',
  'Create provider service categories from Settings before onboarding providers.',
  'Provider and motorist registrations appear in admin after successful save.',
];
