import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Configuración de Vite. El puerto de desarrollo (5173) debe coincidir con
// el CORS_ORIGIN configurado en el backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
