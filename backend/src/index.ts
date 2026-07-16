import { createApp } from './app';
import { env } from './config/env';
import { pool } from './database/pool';

async function bootstrap(): Promise<void> {
  // Comprobamos la conexión a la base de datos antes de aceptar tráfico.
  await pool.query('SELECT 1');
  console.log('[db] Conexión a PostgreSQL verificada');

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[api] Escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  // Apagado ordenado: cerramos el servidor y el pool para no dejar conexiones colgadas.
  const shutdown = (signal: string) => {
    console.log(`\n[api] ${signal} recibido, cerrando...`);
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  console.error('[api] Fallo al arrancar:', error);
  process.exit(1);
});
