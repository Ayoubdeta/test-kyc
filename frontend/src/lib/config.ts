// Configuración del cliente leída de variables de entorno de Vite.
//
// En producción (demo en Vercel) el frontend y la API comparten origen: las
// peticiones a "/api/*" se reescriben (proxy) al backend, así que el valor por
// defecto es la ruta relativa "/api" (cookies same-origin, sin CORS).
//
// En desarrollo local con Docker, define VITE_API_URL (p. ej.
// "http://localhost:4000/api") en frontend/.env.
const apiUrl = import.meta.env.VITE_API_URL ?? '/api';

export const config = {
  apiUrl,
} as const;
