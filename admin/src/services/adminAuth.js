const STORAGE_KEY = 'roadguide_admin_session';

export function loadAdminSession() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) {
      return null;
    }

    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

export function saveAdminSession(session) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  window.localStorage.removeItem(STORAGE_KEY);
}
