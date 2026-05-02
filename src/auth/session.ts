export const SESSION_LAST_ACTIVITY_KEY = 'auth:lastActivityAt';
export const SESSION_LOGOUT_REASON_KEY = 'auth:logoutReason';

export type LogoutReason = 'manual' | 'expired' | 'inactive' | 'unauthorized' | 'sync';

export const SESSION_INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;
export const SESSION_ACTIVITY_THROTTLE_MS = 15 * 1000;

export function getStoredLastActivityAt() {
  const rawValue = localStorage.getItem(SESSION_LAST_ACTIVITY_KEY);
  if (!rawValue) {
    return null;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function saveStoredLastActivityAt(timestamp: number) {
  localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(timestamp));
}

export function clearStoredLastActivityAt() {
  localStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
}

export function getStoredLogoutReason(): LogoutReason | null {
  const value = localStorage.getItem(SESSION_LOGOUT_REASON_KEY);
  if (
    value === 'manual' ||
    value === 'expired' ||
    value === 'inactive' ||
    value === 'unauthorized' ||
    value === 'sync'
  ) {
    return value;
  }

  return null;
}

export function saveStoredLogoutReason(reason: LogoutReason) {
  localStorage.setItem(SESSION_LOGOUT_REASON_KEY, reason);
}

export function clearStoredLogoutReason() {
  localStorage.removeItem(SESSION_LOGOUT_REASON_KEY);
}
