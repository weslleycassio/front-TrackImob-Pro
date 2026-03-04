import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('VITE_API_URL não definida. Configure no .env para integração com a API.');
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
