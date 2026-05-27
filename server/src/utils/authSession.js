const crypto = require('crypto');

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const revokedTokens = new Set();

function getSessionSecret() {
  return process.env.SESSION_SECRET || 'roadguide-dev-session-secret';
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload) {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('base64url');
}

function issueSessionToken({ phoneNumber, roles = [] }) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const payload = JSON.stringify({
    phoneNumber,
    roles,
    expiresAt,
    jti: crypto.randomUUID(),
  });
  const encodedPayload = base64UrlEncode(payload);
  const signature = signPayload(encodedPayload);

  return {
    token: `rg.${encodedPayload}.${signature}`,
    expiresAt,
  };
}

function verifySessionToken(token) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken || revokedTokens.has(normalizedToken)) {
    return null;
  }

  const [prefix, encodedPayload, signature] = normalizedToken.split('.');
  if (prefix !== 'rg' || !encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (actualBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload?.expiresAt || new Date(payload.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    return payload;
  } catch (_error) {
    return null;
  }
}

function revokeSessionToken(token) {
  const normalizedToken = String(token || '').trim();
  if (normalizedToken) {
    revokedTokens.add(normalizedToken);
  }
}

module.exports = {
  issueSessionToken,
  revokeSessionToken,
  verifySessionToken,
};
