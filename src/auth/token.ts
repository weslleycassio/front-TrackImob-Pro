type JwtPayload = Record<string, unknown> & {
  exp?: number;
};

function decodeBase64Url(value: string) {
  const normalizedValue = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddedValue = normalizedValue.padEnd(normalizedValue.length + ((4 - (normalizedValue.length % 4)) % 4), '=');
  return atob(paddedValue);
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const [, payload] = token.split('.');
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(payload)) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenExpiresAt(token: string) {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
    return null;
  }

  return payload.exp * 1000;
}

export function isTokenExpired(token: string, now = Date.now()) {
  const expiresAt = getTokenExpiresAt(token);
  if (!expiresAt) {
    return true;
  }

  return expiresAt <= now;
}
