import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { config } from '../lib/config';
import type { ApiErrorBody } from '../types';

// Instancia central de axios. withCredentials envía y recibe las cookies
// HttpOnly de sesión en cada petición.
export const api = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true,
});

// Endpoints que NO deben disparar el auto-refresh (evita bucles infinitos).
const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

function isAuthPath(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_PATHS.some((path) => url.includes(path));
}

// Cuando varias peticiones fallan con 401 a la vez, compartimos un único
// refresh en curso en lugar de lanzar uno por cada una.
let refreshPromise: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Interceptor de respuesta: ante un 401 en una ruta protegida, intenta
// renovar la sesión una sola vez y reintenta la petición original.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthPath(original.url)
    ) {
      original._retry = true;
      try {
        await refreshSession();
        return api(original as AxiosRequestConfig);
      } catch {
        // El refresh también falló: la sesión no es recuperable.
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

/** Extrae un mensaje de error legible de una respuesta de la API. */
export function getApiErrorMessage(error: unknown, fallback = 'Ha ocurrido un error'): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.error ?? fallback;
  }
  return fallback;
}
