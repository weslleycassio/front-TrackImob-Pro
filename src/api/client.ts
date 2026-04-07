import axios from 'axios';
import { getStoredToken } from '../auth/storage';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  // @ts-expect-error fallback for CRA-style env var
  process.env.REACT_APP_API_URL;

if (!API_BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('Defina VITE_API_URL (ou REACT_APP_API_URL) para conectar com a API.');
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  config.headers = config.headers ?? {};
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
