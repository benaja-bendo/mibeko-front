import axios from 'axios';
import { getStoredToken, handleUnauthorized } from '@/shared/auth/tokenAccess';

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

/** Met en forme un `detail` FastAPI, qui peut être une chaîne ou un tableau
 *  d'erreurs de validation 422 (`{ loc, msg, ... }`) — sinon on afficherait
 *  « [object Object] ». */
function formatPythonError(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const { message, detail } = data as { message?: unknown; detail?: unknown };
  if (typeof message === 'string' && message) return message;
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail)) {
    const lines = detail
      .map((item) => {
        if (!item || typeof item !== 'object') return String(item);
        const { loc, msg } = item as { loc?: unknown[]; msg?: string };
        const field = Array.isArray(loc) ? loc.filter((p) => p !== 'body').join('.') : '';
        return field ? `${field} : ${msg ?? 'invalide'}` : (msg ?? 'invalide');
      })
      .filter(Boolean);
    if (lines.length) return lines.join(' ; ');
  }
  return fallback;
}

pythonClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Session révoquée/expirée : on purge l'auth comme le fait laravelClient,
    // sinon l'app garde un jeton mort et enchaîne les 401 silencieux.
    if (error.response?.status === 401) {
      handleUnauthorized();
    }
    const message = formatPythonError(error.response?.data, error.message || 'Python API error');
    return Promise.reject(new Error(message));
  },
);
