const TOKEN_KEY = 'btimoveis_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}
