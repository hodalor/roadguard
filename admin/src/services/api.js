const API_BASE_URL =
  process.env.ADMIN_API_BASE_URL || 'http://127.0.0.1:5001/api';

async function parseResponse(response, path) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        data?.message ||
          `API endpoint not found for ${path}. Make sure the latest backend is deployed and the route exists.`
      );
    }
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  return parseResponse(response, path);
}

export async function postJson(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return parseResponse(response, path);
}

export async function patchJson(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return parseResponse(response, path);
}
