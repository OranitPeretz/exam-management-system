import axios from 'axios';

import { getAccessToken } from '../features/auth/token-store';

const apiBaseUrl =
  import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export const httpClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});