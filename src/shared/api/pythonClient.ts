import axios from 'axios';
import { getStoredToken } from '@/features/auth/store/authStore';

export const pythonBaseUrl = import.meta.env.VITE_PYTHON_API_URL || '/py/api/v1';

export const pythonClient = axios.create({
  baseURL: pythonBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

pythonClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

pythonClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      'Python API error';
    return Promise.reject(new Error(message));
  },
);
