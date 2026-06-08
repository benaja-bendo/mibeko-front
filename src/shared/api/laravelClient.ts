import axios from 'axios';
import { getStoredToken } from '@/features/auth/store/authStore';

export const laravelBaseUrl = import.meta.env.VITE_LARAVEL_API_URL || '/api/v1';

export const laravelClient = axios.create({
  baseURL: laravelBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

laravelClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

laravelClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      import('@/features/auth/store/authStore').then(({ useAuthStore }) => {
        useAuthStore.getState().clearAuth();
      });
    }
    const message = error.response?.data?.message || error.message || 'API error';
    return Promise.reject(new Error(message));
  },
);
