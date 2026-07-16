// Configuración del cliente leída de variables de entorno de Vite.
// Nunca hardcodeamos la URL de la API en el código.
const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  throw new Error(
    'Falta la variable VITE_API_URL. Copia frontend/.env.example a .env y ajústala.',
  );
}

export const config = {
  apiUrl,
} as const;
