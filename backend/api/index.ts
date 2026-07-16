/// <reference path="../src/types/express.d.ts" />
// Punto de entrada para Vercel (función serverless).
//
// En Vercel no se usa `src/index.ts` (que hace `app.listen`): en su lugar,
// exportamos la app de Express como handler por defecto. Vercel invoca la
// función por cada petición. Las rutas siguen montadas bajo "/api" y el
// `vercel.json` reescribe todo el tráfico a esta función conservando la ruta
// original, así que Express resuelve el enrutado como en local.
import { createApp } from '../src/app';

const app = createApp();

export default app;
