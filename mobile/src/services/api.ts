import axios, { AxiosHeaders } from 'axios';

import { env } from '@/config/env';
import { tokenStorage } from '@/storage/tokenStorage';

const api = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getToken();
  if (token) {
    const headers = AxiosHeaders.from(config.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const message = error.response?.data?.detail || error.message || 'Unexpected error';

    if (error.response?.status === 401) {
      await tokenStorage.removeToken();
    }

    return Promise.reject({
      message,
      status: error.response?.status,
      details: error.response?.data,
    });
  }
);

export default api;
