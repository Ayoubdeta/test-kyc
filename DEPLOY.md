# Desplegar KYC gratis en Vercel + Supabase (demo)

Guía paso a paso para publicar una **demo gratuita** del proyecto. Todo el stack
(frontend, API y base de datos) queda en servicios con plan gratuito.

## Arquitectura del despliegue

```
Navegador
   │  (un solo origen: https://tu-frontend.vercel.app)
   ▼
┌─────────────────────────────┐        rewrite /api/*         ┌──────────────────────────┐
│  Vercel — proyecto FRONTEND │ ────────────────────────────▶ │  Vercel — proyecto BACKEND │
│  SPA React (estática)       │        (proxy same-origin)    │  Express como función      │
└─────────────────────────────┘                               │  serverless (api/index.ts) │
                                                               └─────────────┬──────────────┘
                                                                             │
                                                     ┌───────────────────────┴───────────────────┐
                                                     ▼                                            ▼
                                          ┌────────────────────┐                     ┌────────────────────────┐
                                          │ Supabase PostgreSQL │                     │ Supabase Storage        │
                                          │ (Connection Pooler) │                     │ (bucket privado PDFs)   │
                                          └────────────────────┘                     └────────────────────────┘
```

**Por qué así:** el frontend proxya `/api/*` al backend, de modo que el navegador
ve **un único dominio**. Así las cookies de sesión (`httpOnly`, `SameSite=Lax`)
funcionan sin problemas cross-site.

## Límites de la demo (importante)

- **Subidas y descargas ≤ 4 MB** por fichero: el plan Hobby de Vercel limita el
  payload de una función serverless a ~4,5 MB. `MAX_UPLOAD_MB=4` lo respeta.
- **Chat sin tiempo real (SSE)**: en serverless no hay procesos persistentes, así
  que el chat refresca por **polling** (~30 s). Se controla con `ENABLE_SSE=false`
  (backend) y `VITE_ENABLE_SSE=false` (frontend).
- **Cold start**: la primera petición tras un rato de inactividad tarda 1-2 s.

---

## Requisitos previos

Cuentas gratuitas en: **GitHub**, **Vercel** y **Supabase**. Sube este repo a GitHub
(Vercel despliega desde el repositorio).

---

## Paso 1 — Crear el proyecto en Supabase

1. En [supabase.com](https://supabase.com) → **New project**. Elige región cercana
   (p. ej. `eu-west`), pon una contraseña de base de datos y guárdala.
2. Cuando termine, ve a **Project Settings → Database → Connection string** y copia
   la del **Connection Pooler**, modo **Transaction** (puerto **6543**). Queda así:
   ```
   postgresql://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```
   Ese es tu `DATABASE_URL`. (Sustituye `<PASSWORD>` por la contraseña del paso 1.)
3. Ve a **Project Settings → API** y copia:
   - **Project URL** → `SUPABASE_URL` (p. ej. `https://<ref>.supabase.co`).
   - **service_role key** (en "Project API keys") → `SUPABASE_SERVICE_ROLE_KEY`.
     ⚠️ Es secreta: solo va en el backend, nunca en el frontend.

## Paso 2 — Crear las tablas (migraciones)

1. En Supabase abre **SQL Editor → New query**.
2. Copia **todo** el contenido de [`db/init/_all_supabase.sql`](db/init/_all_supabase.sql)
   y pégalo. Ejecuta (**Run**). Es idempotente y crea todas las tablas.
3. Comprueba en **Table Editor** que aparecen `users`, `documents`, `client_profiles`,
   `chat_messages`, `activity_logs`, etc.

## Paso 3 — Crear el bucket de Storage

1. En Supabase → **Storage → New bucket**.
2. Nombre: **`kyc-files`**. Déjalo **privado** (Public bucket = OFF).
3. No hacen falta políticas: el backend accede con la `service_role key`.

## Paso 4 — Crear el usuario administrador (seed)

En tu máquina, dentro de `backend/`, crea un fichero `.env` con al menos:

```env
DATABASE_URL=postgresql://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres
JWT_ACCESS_SECRET=pon_aqui_un_secreto_largo_aleatorio
JWT_REFRESH_SECRET=pon_aqui_otro_secreto_largo_aleatorio
CORS_ORIGIN=http://localhost:5173
ADMIN_EMAIL=admin@kyc.local
ADMIN_PASSWORD=Admin_Demo_2026
ADMIN_USERNAME=admin
```

Genera los secretos con: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Luego:

```bash
cd backend
npm install
npm run seed:admin
```

Debe imprimir "Administrador creado: admin@kyc.local".
(Alternativa sin Node: se puede insertar el admin a mano, pero el seed es lo más simple.)

## Paso 5 — Desplegar el BACKEND en Vercel

1. En Vercel → **Add New… → Project** → importa tu repo de GitHub.
2. **Root Directory**: `backend`.
3. **Framework Preset**: `Other`. (Build Command y Output Directory: por defecto/vacío.)
4. En **Environment Variables** añade (Production):

   | Variable | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *(la del Paso 1.2)* |
   | `SUPABASE_URL` | *(la del Paso 1.3)* |
   | `SUPABASE_SERVICE_ROLE_KEY` | *(la del Paso 1.3)* |
   | `SUPABASE_BUCKET` | `kyc-files` |
   | `JWT_ACCESS_SECRET` | *(secreto largo)* |
   | `JWT_REFRESH_SECRET` | *(otro secreto largo)* |
   | `ACCESS_TOKEN_TTL` | `15m` |
   | `REFRESH_TOKEN_TTL_DAYS` | `7` |
   | `BCRYPT_SALT_ROUNDS` | `12` |
   | `COOKIE_SECURE` | `true` |
   | `MAX_UPLOAD_MB` | `4` |
   | `ENABLE_SSE` | `false` |
   | `CORS_ORIGIN` | `https://TEMPORAL` *(lo ajustamos en el Paso 7)* |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_USERNAME` | *(los del seed)* |

5. **Deploy**. Al terminar, anota la URL de producción del backend, p. ej.
   `https://kyc-backend.vercel.app`. Pruébala: `https://kyc-backend.vercel.app/api/health`
   debe devolver `{"status":"ok"}`.

## Paso 6 — Desplegar el FRONTEND en Vercel

1. **Antes de desplegar**, edita [`frontend/vercel.json`](frontend/vercel.json) y
   sustituye `https://TU-BACKEND.vercel.app` por la URL real del backend (Paso 5).
   Haz commit y push.
2. En Vercel → **Add New… → Project** → importa el **mismo repo** (segundo proyecto).
3. **Root Directory**: `frontend`. **Framework Preset**: `Vite` (autodetectado).
4. **Environment Variables** (Production):

   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | `/api` |
   | `VITE_ENABLE_SSE` | `false` |

5. **Deploy**. Anota la URL del frontend, p. ej. `https://kyc-demo.vercel.app`.

## Paso 7 — Enlazar CORS y terminar

1. Vuelve al proyecto **backend** en Vercel → **Settings → Environment Variables**.
2. Cambia `CORS_ORIGIN` al dominio real del frontend (Paso 6), p. ej.
   `https://kyc-demo.vercel.app` (sin barra final).
3. **Redeploy** el backend (Deployments → ⋯ → Redeploy).

¡Listo! Comparte la URL del **frontend**.

---

## Verificación

Abre la URL del frontend y comprueba:

1. **Login** con `admin@kyc.local` / la contraseña del seed → entra al panel.
2. **Crear cliente** (admin) → copia el **enlace de activación** → ábrelo en una
   ventana privada → crea contraseña y acepta términos → auto-login como cliente.
3. Como cliente: **sube un PDF** (< 4 MB). Verifícalo en Supabase → Storage → `kyc-files`.
   Vuelve a la app y **descárgalo**: debe abrir el mismo PDF.
4. Circuito de revisión: como compliance/admin "Ver" → "Enviar a aprobación";
   como Dirección, aprobar/rechazar.
5. **Chat**: envía un mensaje y un adjunto; refresca (polling) y descarga el adjunto.
   En la consola del navegador no debe haber reconexiones de `EventSource`.

## Solución de problemas

- **401 tras login / no mantiene sesión**: revisa que `frontend/vercel.json` apunta
  al backend correcto y que `COOKIE_SECURE=true`. El navegador debe ver una sola URL.
- **CORS o "Network Error"**: `CORS_ORIGIN` del backend debe ser EXACTAMENTE la URL
  del frontend (https, sin barra final). Redeploy tras cambiarlo.
- **`Payload Too Large` / 413 al subir**: el fichero supera ~4,5 MB. Usa PDFs más
  pequeños para la demo (`MAX_UPLOAD_MB=4`).
- **500 al subir/descargar**: falta `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` o el
  bucket no se llama `kyc-files`.
- **La API responde 404 en todas las rutas**: confirma que el Root Directory del
  proyecto backend es `backend` y que existe `backend/vercel.json`.
- **Error de conexión a la BD**: usa la cadena del **Pooler (6543)**, no la directa.
