# KYC · Login / Register / Dashboard

Aplicación web full stack de autenticación con panel de usuario.

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + React Query + React Router
- **Backend:** Node.js + Express + TypeScript (arquitectura por capas)
- **Base de datos:** PostgreSQL (en Docker)
- **Seguridad:** JWT (access + refresh) en cookies `HttpOnly`, bcrypt, Helmet, CORS, rate limiting, validación con Zod en cliente y servidor

## Estructura

```
KYC/
├── docker-compose.yml        # Orquesta la base de datos + backend
├── .env.example              # Variables para docker-compose (copia a .env)
├── db/init/01_schema.sql      # Esquema inicial (se ejecuta al crear la BD)
├── backend/                  # API REST
│   └── src/
│       ├── config/ database/ repositories/ services/
│       ├── controllers/ middlewares/ routes/ validators/
│       ├── utils/ types/
│       ├── app.ts  index.ts
└── frontend/                 # SPA
    └── src/
        ├── api/ components/ context/ hooks/ layouts/
        ├── pages/ validators/ lib/ types/
```

### Modelo de datos
- **users** — `id`, `username` (único), `email` (único), `password_hash`, **`role`** (`admin` | `cliente` | `compliance`), `last_login_at`, timestamps.
- **profiles** — 1:1 con users: `full_name`, `phone`, `address`, `birth_date`, `bio`, `avatar_url`.
- **refresh_tokens** — hash de refresh tokens para renovar y **revocar** sesiones (logout real).
- **documents** — metadatos de los PDF subidos por clientes: propietario, nombre, tamaño, `status` (`pendiente`/`aprobado`/`rechazado`), comentario y revisor. El binario del PDF se guarda como fichero en un volumen Docker (`uploads_data`).

### Roles y permisos
- **cliente** — sube y consulta sus propios documentos PDF.
- **compliance** — ve todos los documentos, los descarga y los aprueba/rechaza.
- **admin** — todo lo de compliance + gestiona los roles de los usuarios.

Todo usuario nuevo es **cliente** por defecto. Los roles se asignan desde el panel de administración (o con el seed inicial). El control de acceso se aplica en el servidor (`requireRole`, autoritativo contra la BD).

## Puesta en marcha

### Requisitos
- Docker Desktop (para la base de datos; opcionalmente también el backend)
- Node.js 20+ (para el frontend en desarrollo)

### 1. Configurar variables de entorno

```powershell
# En la raíz del proyecto
Copy-Item .env.example .env

# Backend en local (opción B). Copia también su ejemplo:
Copy-Item backend\.env.example backend\.env

# Frontend
Copy-Item frontend\.env.example frontend\.env
```

Edita `.env` y **cambia las contraseñas y los secretos JWT**. Genera secretos fuertes con:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 2. Levantar base de datos + backend con Docker

```powershell
docker compose up --build
```

Esto arranca:
- **PostgreSQL** en `localhost:5432` (crea las tablas la primera vez con `db/init/01_schema.sql`).
- **Backend** en `http://localhost:4000` (API bajo `/api`).

> Opción B (backend en local en vez de Docker): levanta solo la BD con
> `docker compose up db`, y luego en `backend/`: `npm install` y `npm run dev`.

### 2b. Crear el administrador inicial

Con los contenedores levantados, ejecuta el seed (usa `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_USERNAME` del `.env`):

```powershell
docker compose exec backend node dist/scripts/seedAdmin.js
```

Crea el usuario admin (o promueve a admin uno existente con ese email). Después, ese admin puede asignar roles al resto desde la sección **Usuarios**.

### 3. Levantar el frontend

```powershell
cd frontend
npm install
npm run dev
```

Abre **http://localhost:5173**.

## Flujo de uso
1. Entra en `/register`, crea una cuenta (usuario, email, contraseña; nombre opcional).
2. Quedas autenticado y se te redirige a `/dashboard`, que muestra los datos de tu cuenta y perfil.
3. Pulsa **Cerrar sesión** para revocar la sesión y volver al login.

## Endpoints de la API

| Método | Ruta                 | Descripción                          | Auth |
|--------|----------------------|--------------------------------------|------|
| GET    | `/api/health`        | Healthcheck                          | No   |
| POST   | `/api/auth/register` | Registro (crea usuario + perfil)     | No   |
| POST   | `/api/auth/login`    | Inicio de sesión                     | No   |
| POST   | `/api/auth/refresh`  | Renueva la sesión (rota el refresh)  | Cookie |
| POST   | `/api/auth/logout`   | Cierra sesión (revoca el refresh)    | Cookie |
| GET    | `/api/users/me`      | Datos del usuario autenticado        | Sí   |
| PATCH  | `/api/users/me/profile` | Actualiza el perfil (incl. avatar) | Sí   |
| GET    | `/api/users`         | Lista de usuarios                    | admin |
| PATCH  | `/api/users/:id/role`| Cambia el rol de un usuario          | admin |
| POST   | `/api/documents`     | Sube un PDF                          | cliente |
| GET    | `/api/documents/mine`| Documentos propios                   | cliente |
| GET    | `/api/documents`     | Todos los documentos                 | admin/compliance |
| GET    | `/api/documents/:id/download` | Descarga/visualiza el PDF   | dueño o revisor |
| PATCH  | `/api/documents/:id/review` | Aprueba/rechaza un documento | admin/compliance |

## Notas de seguridad
- Las contraseñas se almacenan **hasheadas con bcrypt**, nunca en claro.
- Los tokens viajan en cookies `HttpOnly` + `SameSite=Lax` (mitiga XSS y CSRF). En producción, pon `COOKIE_SECURE=true` (requiere HTTPS).
- Toda la entrada se **valida en el servidor** (Zod) además de en el cliente.
- Ninguna credencial ni secreto está hardcodeado: todo por variables de entorno.

## Scripts útiles

**Backend** (`backend/`): `npm run dev` · `npm run build` · `npm start` · `npm run typecheck`
**Frontend** (`frontend/`): `npm run dev` · `npm run build` · `npm run preview` · `npm run typecheck`
# test-kyc
