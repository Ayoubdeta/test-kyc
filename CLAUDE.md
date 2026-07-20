# Proyecto

- **Nombre:** KYC (Know Your Customer)
- **Descripción general:** Aplicación web full-stack para la gestión y validación de documentación KYC de clientes. Los clientes suben documentos (PDF), el personal interno los revisa y Dirección General los aprueba/rechaza, con notificaciones, historial de auditoría, KPIs y chat.
- **Objetivo principal:** Digitalizar el flujo de alta y verificación documental de clientes con un circuito de revisión y aprobación por roles, trazable y con estado en tiempo real.

# Estado actual

## Funcionalidades terminadas
- Autenticación (login/logout) con JWT (access + refresh) en cookies httpOnly y refresco automático. **El auto-registro de clientes se ha eliminado**: las cuentas las crea el personal interno y el cliente las activa por enlace.
- Alta de cliente por el admin + activación de cuenta por enlace (token hasheado, 7 días). El cliente crea contraseña y acepta Política de Privacidad y Términos.
- Gestión de usuarios (admin) con panel por pestañas (Cuenta / Documentos / Historial) + botón "Crear cliente".
- Subida de documentos por cliente (uno por tipo), almacenados en disco en carpetas por usuario.
- Máquina de estados del documento (3 fases): `pendiente → en_revision → pendiente_aprobacion → aprobado/rechazado` (+ `caducado` derivado). También `en_revision → rechazado` (cancelar).
- Circuito de revisión por roles:
  - Al pulsar **Ver** un documento `pendiente`, pasa automáticamente a `en_revision` (revisión de compliance/admin).
  - Compliance/Admin deciden desde `en_revision`: **Enviar a aprobación** (→ `pendiente_aprobacion`, notifica a Dirección) o **Cancelar** (→ `rechazado`, el cliente reenvía).
  - Dirección General **aprueba** (fija validez) o **rechaza** desde `pendiente_aprobacion`.
- Notificaciones: documento subido (a revisores), pendiente de aprobar (a Dirección), aprobado/rechazado/por caducar/caducado (al cliente). Campanita con desplegable y borrado.
- Aviso de caducidad 15 días antes (generación perezosa, sin cron).
- Dashboard del cliente **moderno y animado** (hero con degradado, anillo de progreso SVG, tarjetas KPI con count-up, línea de tiempo por documento). Botón "Reenviar" en documentos rechazados; tarjetas de estado enlazan al Historial filtrado.
- Línea de tiempo por documento (`DocumentTimeline`): Subido → En revisión → Pendiente de aprobación → Resultado.
- Menú de perfil en el header (desplegable para todos los roles) con acceso a configuración y logout.
- Iconografía SVG profesional (sin emojis) en `components/icons.tsx`.
- Historial de auditoría inmutable (`document_events`) + página de Historial con chips de filtro por estado (`?estado=`).
- KPIs (overview en dashboard + página completa con filtros y gráficas SVG sin dependencias).
- Chat **avanzado** cliente ↔ compliance/admin (widget flotante para cliente, sección Chat para staff): **tiempo real por SSE**, adjuntos (PDF/imagen), responder/citar, editar y borrar (soft delete), reacciones emoji, "escribiendo…", ticks de lectura por mensaje, identidad del agente que responde, buscador en la conversación y separadores por día.
- **Informes** (personal interno): detalle de documentos por fecha/tipo/estado/cliente (quién envió, cuándo, estado, quién revisó/decidió y **motivo** de cancelación), con resumen y **exportación a CSV** (cliente, sin dependencias).
- **Registro de actividad / logs** (solo admin): auditoría transversal de toda la plataforma (auth, altas, activaciones, subidas, revisiones y decisiones) con filtros (fecha/acción/búsqueda) y paginación.

## Funcionalidades en desarrollo
- (Ninguna activa.)

## Funcionalidades pendientes
- Ver sección "Próximas tareas".

## Última tarea realizada
- **La validez (caducidad) la propone el revisor (2026-07-20):** cambio en la máquina de estados de documentos: el **revisor (admin/compliance)** elige la validez en meses al pulsar **"Enviar a aprobación"** (antes solo la fijaba Dirección al aprobar). **Dirección** ve ese valor **precargado** en su modal de aprobación y **puede ajustarlo**. La caducidad (`expires_at`) se sigue calculando **en el momento de la aprobación** (fecha de aprobación + meses), no en el envío. Nueva columna `documents.validity_months` (migración `12_document_validity_months.sql`, con CHECK 1–120; añadida también a `_all_supabase.sql`). **Backend:** `reviewSchema` exige `validityMonths` cuando `action='enviar_aprobacion'` (Zod refine); `documentRepository.sendToApproval` guarda `validity_months`, `rejectByReviewer` lo limpia (NULL), `decide` lo persiste; `document.service.decide` usa `input.validityMonths ?? existing.validity_months ?? 12`. `PublicDocument.validityMonths`/`DocumentRow.validity_months` + mapper. **Frontend:** `DocumentReviewList` muestra el selector de validez en el modal de "Enviar a aprobación" (`reviewValidityMonths`) y precarga la validez propuesta en el modal de Dirección (`openDecision`); `documentsApi.sendToApproval(id, validityMonths, comment?)`; `DocumentItem.validityMonths`. Reutiliza claves i18n existentes (`list.validity`, `list.months`). Verificado: typecheck backend OK y build frontend OK. **Pendiente: aplicar la migración `12` en Supabase (demo desplegada) y/o en el Docker local.**
- **Mejoras de calidad — prioridad ALTA (2026-07-20):** tras una auditoría completa (seguridad+arquitectura backend, calidad frontend, BD+despliegue) se aplicaron las 4 mejoras críticas. (1) **Secretos fuera del repo:** `credenciales.txt` y `test.txt` sacados del control de versiones (`git rm --cached`) y añadidos a `.gitignore` (siguen en disco). Pendiente por el usuario: rotar contraseñas de demo y, si el repo se hace público, purgar el historial. (2) **`trust proxy`** en `backend/src/app.ts` (`app.set('trust proxy', 1)`): detrás de Vercel el rate limiter ahora usa la IP real del cliente → la protección anti-fuerza-bruta del login funciona (antes agrupaba todo en un bucket global). (3) **Manejo de errores en el frontend:** nuevo `components/QueryError.tsx` (estado de error reutilizable con reintento) aplicado con `isError`+`refetch` en TODAS las páginas de datos (KpisPage, LogsPage, ReportsPage, ClientDocumentsPage, HistoryPage, NotificationsPage, ChatPage, AdminUsersPage y las 4 de revisión vía prop `isError`/`onRetry` en `DocumentReviewList`) y en `StaffKpiOverview` (que además tenía un bug de "cargando infinito" al fallar); nuevo `components/ErrorBoundary.tsx` envolviendo `<App/>` en `main.tsx` (evita pantalla en blanco ante errores de render). Claves i18n nuevas (`common.loadError/retry/appError/appErrorHint/reload`) en los 7 idiomas. (4) **Code splitting:** las 17 páginas se cargan con `lazy()` + `<Suspense fallback={<PageSpinner/>}>` en `App.tsx` → un chunk por página, bundle inicial más ligero. Verificado: typecheck backend OK y `npm run build` frontend OK (chunks por página confirmados). Pendiente/ofrecido: mejoras de prioridad MEDIA (índices en FKs, validación UUID de params, transacciones en `document.service`, magic-bytes en subidas, RTL con propiedades lógicas, focus-trap en modales, `staleTime` global, runner de migraciones, `/health` con `SELECT 1`).
- **Multilenguaje / i18n (2026-07-16):** selector de idioma con 7 idiomas — castellano (`es`), catalán (`ca`), inglés (`en`), alemán (`de`), francés (`fr`), árabe (`ar`, **RTL**) y chino (`zh`) — y **preferencia por usuario** persistida. Solución **propia y ligera** (sin dependencias): `frontend/src/i18n/` con `config.ts` (idiomas + dir), `locales/*.json` (diccionarios planos con claves namespaced e interpolación `{var}`), `index.tsx` (`I18nProvider` + `useI18n()` con `t`, `lang`, `dir`, `setLang`) y `labels.ts` (helpers `statusLabel`/`roleLabel`/`docTypeLabel`/`eventLabel`/`logActionLabel` para las etiquetas basadas en datos). Fuente de verdad del idioma: `localStorage['kyc_lang']` (instantáneo/sin sesión) → `profile.language` (persiste entre dispositivos, se adopta al iniciar sesión) → idioma del navegador → `es`. El árabe fija `document.documentElement.dir='rtl'`. Selector `LanguageSwitcher` (`<select>` nativo) en `UserMenu`, `AuthLayout` (login/activación) y una sección "Idioma" en `SettingsPage`. **Backend:** columna `profiles.language` (migración `11_language_preference.sql`, con CHECK; añadida también a `_all_supabase.sql` y aplicada en Supabase), `PublicProfile.language`, endpoint `PATCH /api/users/me/language` (validador Zod `languageSchema`, solo `requireAuth`), constante `SUPPORTED_LANGUAGES`. Traducida **toda la UI** (login, activación, cabecera/nav, dashboards cliente y staff, documentos, historial, revisión + modales, notificaciones, KPIs, informes+CSV, logs, chat, administración de usuarios) con *fallback* a castellano para claves ausentes. Verificado: typecheck backend, `npm run build` frontend (OK) y prueba e2e del endpoint (cambio persiste; inválido→400; sin sesión→401). Pendiente: traducir textos generados por el **backend** (notificaciones/errores del servidor) y pulido fino de RTL.
- **Despliegue gratuito en Vercel + Supabase (2026-07-16):** adaptación del proyecto para una **demo pública gratuita**. Frontend (SPA) y backend (Express como función serverless) en **dos proyectos Vercel**; el frontend **proxya `/api/*`** al backend vía `rewrite` de `frontend/vercel.json` (mismo origen → cookies `SameSite=Lax` sin problemas). PostgreSQL en **Supabase** (Connection Pooler 6543; `pool.ts` usa `DATABASE_URL`+SSL con `max:1` si está presente). Ficheros (PDFs + adjuntos de chat) migrados de disco a **Supabase Storage** (`backend/src/utils/storage.ts`; middlewares a `memoryStorage`; subida/descarga por buffer; descargas con `res.send(buffer)`). SSE **desactivado por entorno** (`ENABLE_SSE`/`VITE_ENABLE_SSE`) → chat por polling. `MAX_UPLOAD_MB=4` por el límite de payload de Vercel Hobby (~4,5 MB). Nuevos ficheros: `backend/api/index.ts`, `backend/vercel.json`, `frontend/vercel.json`, `db/init/_all_supabase.sql` (migraciones concatenadas) y **`DEPLOY.md`** (guía paso a paso). Verificado: typecheck backend, entrypoint Vercel y build frontend OK. **El flujo local con Docker sigue intacto.**
- **Chat avanzado (2026-07-16):** tiempo real por **SSE** (`GET /chat/stream` + `chatBus` en memoria; las señales disparan recarga en el cliente), adjuntos PDF/imagen (`chatUpload` a `<clientId>/chat/`, descarga con auth), responder/citar (`reply_to_id`), editar y borrar (soft delete), reacciones emoji (JSONB toggle), "escribiendo…" (evento efímero), ticks de lectura por mensaje, identidad del agente, buscador en la conversación y separadores por día. Migración `10_chat_advanced.sql`. Verificado (typecheck, build y e2e, incl. entrega SSE en vivo).
- **Informes + Logs (2026-07-16):** apartado de **Informes** para el personal interno (detalle filtrable de documentos + resumen + exportación CSV en cliente) y **Registro de actividad/logs** solo para admin (auditoría transversal con filtros y paginación). Nueva tabla `activity_logs`, `logService.record` tolerante a fallos enganchado en los controladores (auth/user/document). Migración `09_activity_logs.sql`. Verificado con typecheck, build y e2e.
- **Fase 1 del rediseño de alta de cliente (2026-07-16):** eliminado el auto-registro (`/auth/register` → 404); el admin crea el cliente (razón social, CIF, tipo, comercial, email) generando su expediente en estado "Pendiente de completar" + token de activación (enlace mostrado en la app). El cliente activa su cuenta en `/activate?token=...` (contraseña + aceptación de privacidad/términos, auto-login). Nueva tabla `client_profiles` con todos los campos del expediente (Fase 2 nullable). Migración `08_client_onboarding.sql`. Verificado con typecheck, build y e2e (8/8).

# Arquitectura

- **Arquitectura:** Cliente-servidor. Frontend SPA (React) + API REST (Express) + PostgreSQL. Backend en capas: **routes → controllers → services → repositories**.
- **Estructura de carpetas (raíz):**
  - `frontend/` — SPA React/Vite/TS.
  - `backend/` — API Node/Express/TS.
  - `db/init/` — migraciones SQL idempotentes (se aplican manualmente vía `docker exec`).
  - `docker-compose.yml` — orquestación (db + backend).
- **Frontend (`frontend/src/`):** `pages/`, `components/` (+ `components/ui/`, `components/charts/`), `layouts/`, `hooks/`, `api/`, `lib/`, `types/`.
- **Backend (`backend/src/`):** `routes/`, `controllers/`, `services/`, `repositories/`, `middlewares/`, `validators/`, `config/`, `database/`, `utils/`, `types/`.
- **Flujo de la aplicación:**
  0. El admin crea la cuenta de cliente → expediente "Pendiente de completar" + enlace de activación. El cliente activa (contraseña + privacidad/términos).
  1. Cliente sube PDF por tipo → estado `pendiente` → notifica a compliance/admin.
  2. Compliance/Admin pulsan "Ver" → el documento pasa automáticamente a `en_revision`. Desde ahí: "Enviar a aprobación" (→ `pendiente_aprobacion`, notifica a Dirección) o "Cancelar" (→ `rechazado`, notifica al cliente para reenvío).
  3. Dirección aprueba (→ `aprobado` + `expires_at`) o rechaza (→ `rechazado`) desde `pendiente_aprobacion`; notifica al cliente.
  4. `caducado` se calcula al leer (aprobado + `expires_at` < now).
- **Base de datos:** ver sección "Base de datos".

# Tecnologías

- **Frontend:** React 18, TypeScript (strict), Vite 5, Tailwind CSS 3.4, React Router 6, TanStack React Query 5, Axios, Zod.
- **Backend:** Node 20, Express 4, TypeScript (CommonJS), Zod, `pg`, multer, jsonwebtoken.
- **Base de datos:** PostgreSQL 16 (Docker).
- **IA:** (No implementada.) Evaluada la viabilidad de un asistente IA (análisis de documentos + resúmenes para staff) vía Claude API (requiere API de pago aparte de la licencia; contemplar RGPD). Sin implementación por ahora.
- **DevOps:** Docker, Docker Compose.
- **Librerías principales:** React Query, Axios (interceptor de auto-refresh), Zod (validación cliente y servidor), multer (subida de ficheros), gráficas SVG propias (sin librerías de charts).

# Decisiones técnicas

- Se utiliza React con TypeScript (strict) + Vite.
- Se utiliza Express con TypeScript en arquitectura por capas (routes/controllers/services/repositories).
- Se utiliza PostgreSQL (no SQL Server) mediante `pg` Pool.
- Los PDFs se almacenan en **disco**, en carpetas por usuario (`uploadDir/<userId>/`), no en la base de datos; se guarda la ruta relativa en `stored_name`.
- Se utiliza JWT (access + refresh) en cookies **httpOnly**; el rol se lee de la BD de forma autoritativa en `requireRole`.
- Se utiliza Docker/Docker Compose para el despliegue local.
- Las migraciones SQL son **idempotentes** y se aplican manualmente (`Get-Content archivo | docker exec -i kyc_db psql ...`).
- El estado `caducado` es **derivado** (no persistido): se calcula en `effectiveStatus()` y en SQL de stats con `CASE`.
- Notificaciones de caducidad **perezosas** (sin cron): `syncExpiring`/`syncExpired`, idempotentes con `NOT EXISTS`.
- Historial mediante tabla de auditoría `document_events` (inmutable), desacoplada de las notificaciones (que el usuario puede borrar).
- Gráficas SVG propias (DonutChart, BarChart, TrendBars, KpiCard) para no añadir dependencias pesadas.
- **[REEMPLAZADA — 2026-07-16]** ~~Chat por **polling** (10–20 s), no websockets~~; conversación indexada por `client_id`.
- **Chat en tiempo real por SSE** (no WebSockets): endpoint `GET /chat/stream` + `chatBus` (EventEmitter en memoria; válido con una única instancia de backend — si se escala, sustituir por pub/sub tipo Redis sin tocar emisores/suscriptores). Los eventos SSE son **señales ligeras** ("algo cambió en esta conversación"); el frontend recarga por su vía normal (React Query) para que el mapeo por-espectador (mine / reacción propia) lo haga siempre el servidor. Polling queda como red de seguridad a intervalo largo (30 s). El "escribiendo…" es un evento efímero (no se persiste). Los adjuntos se descargan vía axios (blob) porque la cookie httpOnly SameSite no viajaría en una subpetición cross-origin (`<img src>`).
- Nuevo rol **Dirección General** (`direccion`): compliance/admin revisan pero **no aprueban**; aprobar/rechazar la decisión final es exclusivo de Dirección.
- **[Request F — REEMPLAZADA por el rediseño 2026-07-16]** La revisión de compliance/admin ya NO pasa el documento a revisión automáticamente al pulsar "Ver"; ahora requiere acción explícita "Enviar a aprobación" o "Rechazar". El estado `en_revision` se muestra en UI como "Pendiente de aprobación".
- **[Reemplaza Request F — 2026-07-16]** Máquina de estados de 3 fases con estado nuevo `pendiente_aprobacion`, que separa "compliance revisando" (`en_revision`) de "esperando a Dirección" (`pendiente_aprobacion`) para mantener limpia la cola de Dirección. Al pulsar **Ver** un documento `pendiente` pasa **automáticamente** a `en_revision`. Desde `en_revision`: "Enviar a aprobación" (→ `pendiente_aprobacion`) o "Cancelar" (→ `rechazado`, el cliente reenvía). En UI, `en_revision` = "En revisión" y `pendiente_aprobacion` = "Pendiente de aprobación".
- **Alta de cliente solo por personal interno**: se elimina el auto-registro. El cliente no puede crearse cuenta; la crea el admin y el cliente la activa por enlace.
- **Activación por enlace mostrado en la app** (sin infraestructura de email por ahora): token aleatorio (`crypto.randomBytes(32)`), se guarda **hasheado** (SHA-256) en `activation_token_hash`; el token en claro va en el enlace. TTL 7 días (`ACTIVATION_TTL_DAYS`). `password_hash` es **nullable** hasta la activación; el login de una cuenta sin activar devuelve credenciales inválidas (con verificación dummy de tiempo constante).
- **Modelo de datos del cliente enriquecido** en tabla `client_profiles` (tipos de cliente empresa/autónomo/particular — de momento solo **Empresa**; `expediente_status`; nivel de riesgo; comercial asignado; datos de empresa/dirección fiscal/representante/contacto/banco/KYC). El rediseño de alta se implementa **por fases**.
- **Iconografía SVG propia** (estilo Lucide) en lugar de emojis, para una imagen profesional.
- **Logging tolerante a fallos**: `logService.record` captura sus propios errores (la auditoría nunca tumba la operación de negocio) y se invoca `void` (fire-and-forget) desde los **controladores** (frontera con `req`), no desde los services, para mantener los services puros. El actor/IP se derivan del JWT ya validado (`req.user`) + `x-forwarded-for`, sin consultas extra.
- **Exportación CSV en el cliente** (sin dependencias): separador `;` y BOM UTF-8 para compatibilidad con Excel en configuración ES.
- **Acceso por rol**: Informes = `STAFF_ROLES` (admin/compliance/dirección); Logs = solo `admin`.
- El log de auditoría (`activity_logs`) es **transversal y técnico** (quién hizo qué, cuándo, desde qué IP) y se diferencia de `document_events` (historial funcional de un documento, visible por el cliente).
- **Despliegue serverless (Vercel + Supabase, 2026-07-16):**
  - **Mismo origen vía proxy**: en vez de exponer el backend en otro dominio (que obligaría a `SameSite=None`+cookies de terceros, bloqueables por el navegador), el proyecto frontend de Vercel **reescribe `/api/*`** al proyecto backend. El navegador ve un único dominio → cookies `SameSite=Lax` intactas y sin CORS real. `frontend/src/lib/config.ts` usa `'/api'` por defecto (relativo).
  - **Backend como función**: `backend/api/index.ts` exporta la app de Express (`createApp()`); `src/index.ts` (con `listen`) solo se usa en local/Docker. `backend/vercel.json` reescribe todo a la función conservando la ruta.
  - **BD con pooler**: en serverless cada invocación es efímera; se usa el Connection Pooler de Supabase (Supavisor, puerto 6543, modo transaction) con `max:1` y `ssl`. `DATABASE_URL` tiene prioridad sobre `PG*` en `pool.ts`.
  - **Ficheros en Supabase Storage** (no en disco): el disco serverless es efímero/solo lectura. `multer` pasa a `memoryStorage` y `backend/src/utils/storage.ts` (cliente `service_role`) sube/descarga/borra sobre un bucket privado. La columna `stored_name`/`attachment_stored` guarda ahora la **clave del objeto** en el bucket (misma semántica que antes con la ruta relativa). Descargas por buffer (`res.send`) — válido porque `MAX_UPLOAD_MB=4` cabe en el límite ~4,5 MB de Vercel Hobby. Mejora futura: subida directa navegador→Storage con signed URL para superar ese límite.
  - **SSE desactivable por entorno**: `ENABLE_SSE` (backend, def. `true`) y `VITE_ENABLE_SSE` (frontend). En Vercel se ponen a `false` → el chat cae a polling (30 s); en local siguen activos. El endpoint `/chat/stream` responde `204` si `ENABLE_SSE` es falso.

# Funcionalidades implementadas

- Auth: login (por `identifier` = email o username), logout, refresh automático, **activación de cuenta** (info + activar). **Sin auto-registro.**
- Alta de cliente (admin): `POST /users/clients` crea usuario sin contraseña + perfil + expediente y devuelve `{ user, activationToken }`.
- Roles: `cliente`, `compliance`, `admin`, `direccion`. Conjuntos: `STAFF_ROLES` (ver/descargar todo), `REVIEW_ROLES` (revisar = admin/compliance), `APPROVAL_ROLES` (aprobar = direccion).
- Documentos: subida (reemplazo por tipo), listado propio, historial, listado por usuario (admin), listado global (staff), descarga, iniciar revisión (`start-review`), revisión (`enviar_aprobacion`/`cancelar`), decisión.
- Notificaciones: creación por eventos, listado, borrado, enlaces contextuales según tipo.
- KPIs: overview (dashboard) y página con filtros (fecha/tipo/estado) + tablas por usuario.
- Chat: cliente ↔ staff, no leídos, conversaciones.

# Base de datos

- **Tablas principales:**
  - `users` (id, username, email, `password_hash` **nullable**, role, `activation_token_hash`, `activation_expires_at`, ...).
  - `profiles` (user_id FK, full_name, avatar_url, ...).
  - `client_profiles` (user_id PK/FK, `client_type` [empresa|autonomo|particular, def. empresa], `expediente_status` [pendiente_completar|enviado|en_revision|aprobado|rechazado|activo, def. pendiente_completar], `risk_level`, `comercial_asignado`, `razon_social` NOT NULL, `cif`, + campos de empresa/dirección fiscal/representante/contacto/banco/KYC (nullable, Fase 2), `privacy_accepted_at`, `terms_accepted_at`, `submitted_at`, timestamps + trigger `updated_at`).
  - `documents` (id, user_id FK, doc_type, original_name, stored_name, mime_type, size_bytes, status, review_comment, reviewed_by, reviewed_at, decided_by, decided_at, expires_at, uploaded_at).
  - `notifications` (id, user_id FK, type, title, message, document_id, read_at, created_at).
  - `document_events` (auditoría inmutable: user_id, document_id, doc_type, original_name, event_type, comment, expires_at, actor_id, created_at).
  - `chat_messages` (id, client_id, sender_id, sender_role ['cliente'|'staff'], body, read_at, created_at, + chat avanzado: `reply_to_id`, `edited_at`, `deleted_at`, `attachment_name/stored/mime/size`, `reactions` JSONB).
  - `activity_logs` (auditoría global, append-only: id BIGSERIAL, actor_id FK SET NULL, actor_role, actor_label desnormalizado, action, entity_type, entity_id, description, metadata JSONB, ip, created_at).
- **Relaciones:** documents/notifications/profiles → users; document_events y chat_messages referencian usuario/documento.
- **Restricciones:** CHECK en `role`, `documents.status` (incluye `pendiente_aprobacion`), `document_events.event_type`, `client_profiles.client_type` y `.expediente_status`; un documento activo por (user_id, doc_type).
- **Cambios (migraciones en `db/init/`):**
  - `04_document_events.sql` — tabla de auditoría.
  - `05_workflow_direccion.sql` — rol `direccion`, estados y eventos actualizados, columnas `decided_by`/`decided_at`.
  - `06_chat.sql` — tabla `chat_messages`.
  - `07_review_approval_state.sql` — estado `pendiente_aprobacion` en el CHECK; migra los `en_revision` sin decidir → `pendiente_aprobacion`.
  - `08_client_onboarding.sql` — `password_hash` nullable + columnas de activación en `users`; tabla `client_profiles`.
  - `09_activity_logs.sql` — tabla `activity_logs` (auditoría global) + índices por fecha/actor/acción.
  - `10_chat_advanced.sql` — columnas de chat avanzado en `chat_messages` (respuesta, edición/borrado, adjuntos, reacciones).
  - `11_language_preference.sql` — columna `profiles.language` (i18n) con CHECK de idiomas soportados.
  - `12_document_validity_months.sql` — columna `documents.validity_months` (validez propuesta por el revisor al enviar a aprobación; CHECK 1–120).

# APIs

Base: `http://localhost:4000/api`

| Ruta | Método | Descripción | Estado |
|---|---|---|---|
| `/auth/register` | POST | ~~Registro de cliente~~ | ❌ Eliminada |
| `/auth/login` | POST | Login (`identifier` + `password`) | ✅ |
| `/auth/logout` | POST | Logout | ✅ |
| `/auth/refresh` | POST | Refresco de token | ✅ |
| `/auth/me` | GET | Usuario actual + perfil | ✅ |
| `/auth/activate/:token` | GET | Info de activación (`{ email, razonSocial }`) | ✅ |
| `/auth/activate` | POST | Activar cuenta (`{token, password, acceptPrivacy, acceptTerms}`) | ✅ |
| `/users/clients` | POST | Crear cliente (admin) → `{ user, activationToken }` | ✅ |
| `/users/me/language` | PATCH | Guardar idioma preferido (i18n) `{ language }` | ✅ |
| `/documents` | POST | Subir PDF (cliente) | ✅ |
| `/documents/mine` | GET | Mis documentos (cliente) | ✅ |
| `/documents/history` | GET | Historial propio (cliente) | ✅ |
| `/documents` | GET | Listar todos (staff) | ✅ |
| `/documents/user/:id` | GET | Documentos de un usuario (admin) | ✅ |
| `/documents/user/:id/history` | GET | Historial de un usuario (admin) | ✅ |
| `/documents/:id/download` | GET | Descargar PDF (propietario o staff) | ✅ |
| `/documents/:id/start-review` | PATCH | Iniciar revisión (REVIEW_ROLES): `pendiente → en_revision` | ✅ |
| `/documents/:id/review` | PATCH | Revisión (REVIEW_ROLES): `{action:'enviar_aprobacion'\|'cancelar', comment?}` | ✅ |
| `/documents/:id/decision` | PATCH | Decisión final (APPROVAL_ROLES): `{status, comment?, validityMonths?}` | ✅ |
| `/notifications` | GET | Listar notificaciones | ✅ |
| `/notifications/:id` | DELETE | Borrar notificación | ✅ |
| `/stats/overview` | GET | KPIs resumen (staff) | ✅ |
| `/stats` | GET | KPIs con filtros (staff) | ✅ |
| `/reports/documents` | GET | Informe detallado de documentos (staff): `from,to,docType,status,clientId,search` | ✅ |
| `/logs` | GET | Registro de actividad (admin): `from,to,action,actorId,search,page,pageSize` | ✅ |
| `/chat/stream` | GET | Tiempo real (SSE) para cliente/staff | ✅ |
| `/chat/me`, `/chat/conversations/:id` | GET/POST | Mensajes (POST multipart: texto y/o adjunto + `replyToId`) | ✅ |
| `/chat/me/typing`, `/chat/conversations/:id/typing` | POST | Señal "escribiendo…" | ✅ |
| `/chat/messages/:id` | PATCH/DELETE | Editar / borrar (soft) el propio mensaje | ✅ |
| `/chat/messages/:id/react` | POST | Alternar reacción emoji | ✅ |
| `/chat/attachments/:id` | GET | Descargar adjunto (participante) | ✅ |
| `/users` (+ admin) | varios | Gestión de usuarios (admin) | ✅ |

# Componentes importantes

- **Frontend — páginas:** `DashboardPage` (rama cliente → `ClientDashboard`), `ClientDocumentsPage`, `HistoryPage` (chips de filtro + `?estado=`), `ReviewDocumentsPage`, `PendingReviewDocumentsPage` (por revisar), `InReviewDocumentsPage` (en aprobación), `PendingApprovalPage` (Dirección), `KpisPage`, `ReportsPage` (informes, staff), `LogsPage` (auditoría, admin), `ChatPage`, `AdminUsersPage`, `NotificationsPage`, `SettingsPage`, `LoginPage`, `ActivatePage`.
- **Frontend — componentes:** `DocumentReviewList` (lista agrupada por usuario + auto-start en Ver + modales), `ClientDashboard` (hero animado, `ProgressRing`, `StatCard`, `ActionCard`), `DocumentTimeline` (stepper + botón "Reenviar"), `UserMenu` (menú de perfil en header, todos los roles), `CreateClientModal` (alta cliente + enlace de activación), `icons.tsx` (set SVG + `DocTypeIcon`/`EventIcon`/`NotificationIcon`), `StaffKpiOverview`, `charts/Charts` (KpiCard/DonutChart/BarChart/TrendBars), `NotificationBell`, `ChatWidget`, `ChatThread`, `UserDocumentsPanel`, `UserHistoryPanel`, `AdminUserEditModal`, `ClientDocumentsSummary`, `Badge`, `ui/*`.
- **Frontend — componentes (chat):** `ChatThread` (hilo avanzado: responder, editar/borrar, reacciones, emojis, adjuntos, ticks, identidad del agente, buscar, separadores por día, "escribiendo…"), `ChatWidget` (cliente), `ChatAttachmentView` (previsualiza imagen / descarga adjunto vía blob).
- **Frontend — hooks:** `useCountUp` (animación count-up con `requestAnimationFrame`, respeta `prefers-reduced-motion`), `useChatStream` (suscripción SSE con `EventSource` + credenciales).
- **Frontend — lib:** `roles.ts` (labels, badges, helpers `isStaff`/`canReview`/`canApprove`, STATUS_LABELS/BADGE/HEX con `pendiente_aprobacion`), `documents.ts` (metadatos de eventos/notificaciones, sin emojis), `format.ts`, `csv.ts` (`buildCsv`/`downloadCsv`/`exportCsv`), `logs.ts` (LOG_ACTION_LABELS/BADGE/ORDER).
- **Frontend — api:** `reports.api.ts`, `logs.api.ts` (además de auth/admin/stats/documents/chat/notifications).
- **Backend:** `document.service`/`document.repository` (`startReview`/`sendToApproval`/`rejectByReviewer`), `user.service`/`user.repository` (`createClient`/`activateAccount`/`findActivatableByTokenHash`), `auth.service` (`activate`/`getActivationInfo`), `report.*` (informes), `activityLog.*` + `logService.record` (auditoría), `chat.*` (chat avanzado: adjuntos/reply/edit/delete/react/typing + SSE), `utils/chatBus` (bus SSE), `utils/requestContext` (`actorFromReq`/`getClientIp`), `utils/tokens`, `stats.*`, `notification.service`, middlewares (`auth`, `role`, `upload`, `chatUpload`, `validate`), `utils/mappers` (`docTypeLabel`/`toPublicActivityLog`/`toPublicChatMessage`), `config/constants`.

# Configuración

- **Variables de entorno (backend):** `PORT`, `DATABASE_URL` (o `PGHOST`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `UPLOAD_DIR`, `CORS_ORIGIN`, `COOKIE_SECURE`, `MAX_UPLOAD_MB` (def. 4). **Despliegue:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET` (def. `kyc-files`), `ENABLE_SSE` (def. `true`; `false` en Vercel). (No incluir valores reales aquí.)
- **Frontend:** `VITE_API_URL` (base de la API; def. `/api` si no se define), `VITE_ENABLE_SSE` (`false` en la demo Vercel).
- **Configuraciones importantes:** cookies httpOnly para tokens; multer diskStorage a carpetas por usuario; Vite dev server en `5173`; API en `4000`.
- **Constantes clave (`backend/src/config/constants.ts`):** ROLES, STAFF_ROLES, REVIEW_ROLES, APPROVAL_ROLES, DOCUMENT_STATUS (incluye `PENDING_APPROVAL`), NOTIFICATION_TYPE, DOCUMENT_EVENT, CHAT_SENDER, EXPIRY_WARNING_DAYS=15, MIN/MAX_VALIDITY_MONTHS, CLIENT_TYPE, EXPEDIENTE_STATUS, ACTIVATION_TTL_DAYS=7, LOG_ACTION, LOG_ENTITY.

# Problemas conocidos

- Al **aprobar** en Dirección, `review_comment` se sobrescribe con el comentario de la decisión (queda `null` si no se comenta), perdiendo el comentario previo de revisión. Comportamiento heredado; revisar si se quiere conservar ambos.
- Migraciones SQL se aplican **manualmente** (no hay runner automático).
- Chat por polling (latencia de 10–20 s); sin websockets.
- Entorno solo probado en local (Docker en Windows).
- Activación **sin email real**: el enlace se muestra al admin en la app para compartirlo manualmente.

# Próximas tareas

1. **Fase 2 del alta de cliente:** asistente multipaso (pasos 2–8) para que el cliente complete el expediente (empresa, dirección fiscal, representante legal, persona de contacto, datos bancarios, KYC/declaraciones, documentación) → "Enviar para revisión" (`expediente_status = enviado`). La tabla `client_profiles` ya tiene todas las columnas (nullable). Tras activar, redirigir al asistente si el expediente está "pendiente de completar".
2. **Fase 3 del alta de cliente:** revisión del expediente por Decal + nivel de riesgo + aprobar/rechazar + activar cliente (`expediente_status`: en_revision → aprobado/activo).
3. Posible: asistente IA (análisis de documentos + resúmenes para staff) vía Claude API.
4. Posible: runner automático de migraciones.
6. Posible: conservar comentario de revisión al aprobar.
7. Posible: envío real del enlace de activación por email.

# Historial

## 2026-07-15
- Request A: aviso de caducidad 15 días; resumen de documentos en dashboard del cliente; campanita con desplegable y borrado; pestaña Historial del cliente; motivo de rechazo en notificaciones.
- Request B: vista admin por usuario; almacenamiento en carpetas por usuario; nuevo estado + rol Dirección General; sección "pendientes de aprobar" + notificación a Dirección.
- Request C: poner en revisión al ver (compliance/admin); sección "en revisión"; KPIs en dashboard con mini gráficas; página KPIs completa con filtros.
- Request D: KPIs clicables; etiquetas del header sin saltos de línea; notificación a compliance/admin al subir documentación; panel de usuario con documentos/historial; chat cliente ↔ staff.
- Request E: KPI "Falta por aprobar" (= documentos en `en_revision`).
- Request F: botones "Enviar a aprobación" / "Rechazar" en revisión; se elimina auto-envío al ver; `en_revision` → "Pendiente de aprobación" en UI; consolidación de KPIs duplicados; verificado (typecheck/build/e2e).
- Creado `CLAUDE.md` como memoria técnica del proyecto.

## 2026-07-16
- Rediseño del flujo de revisión (reemplaza Request F): máquina de estados de 3 fases con `pendiente_aprobacion`; auto-paso a `en_revision` al pulsar "Ver"; acciones "Enviar a aprobación" / "Cancelar" (cancelar → rechazado y el cliente reenvía). Migración `07_review_approval_state.sql`.
- Dashboard del cliente rediseñado: moderno, animado (hero degradado, anillo de progreso, count-up), con línea de tiempo por documento (`DocumentTimeline`).
- Menú de perfil en el header (desplegable, todos los roles); iconografía SVG profesional (sin emojis); botón "Reenviar" en documentos rechazados; tarjetas de estado enlazan al Historial filtrado (`?estado=`).
- Consulta de viabilidad de asistente IA (Claude API): posible pero no implementado.
- Fase 1 del rediseño de alta de cliente: eliminado auto-registro; el admin crea el cliente + expediente + enlace de activación; el cliente activa su cuenta (contraseña + privacidad/términos). Tabla `client_profiles`; migración `08_client_onboarding.sql`. Verificado con e2e (8/8).
- Apartado de **Informes** (staff): detalle filtrable de documentos (fecha/tipo/estado/cliente) con resumen y exportación CSV en cliente; enlace de datos con revisor/decisor y motivo de cancelación.
- **Registro de actividad / logs** (solo admin): tabla `activity_logs`, `logService.record` tolerante a fallos enganchado en controladores; endpoint `/logs` filtrable y paginado. Migración `09_activity_logs.sql`. Verificado con e2e (registro, filtros, permisos 403).
- **Chat avanzado:** tiempo real por SSE (`chatBus` + `/chat/stream`), adjuntos PDF/imagen, responder/citar, editar/borrar (soft delete), reacciones, "escribiendo…", ticks de lectura, identidad del agente, buscador y separadores por día. Migración `10_chat_advanced.sql`. Verificado con e2e (incl. entrega SSE en vivo y permisos 403).
- `CLAUDE.md` actualizado con todos estos cambios.
- **Despliegue gratuito Vercel + Supabase:** backend Express como función serverless (`backend/api/index.ts` + `backend/vercel.json`), frontend con proxy `/api/*` (`frontend/vercel.json`), BD en Supabase (pooler, `DATABASE_URL` en `pool.ts`), ficheros en Supabase Storage (`utils/storage.ts`, middlewares a `memoryStorage`, descargas por buffer), SSE desactivable (`ENABLE_SSE`/`VITE_ENABLE_SSE`), `MAX_UPLOAD_MB=4`. Añadidos `db/init/_all_supabase.sql` y `DEPLOY.md`. Docker local sin cambios de comportamiento.

## 2026-07-20
- **Auditoría del proyecto** (3 revisiones en paralelo: seguridad+arquitectura backend, calidad frontend, BD+despliegue). Valoración: proyecto bien construido; hallazgos son mejoras puntuales, no estructurales. Diagnóstico priorizado (ALTA/MEDIA/BAJA) en el plan `elegant-floating-flamingo.md`.
- **Mejoras de prioridad ALTA implementadas** (rama `feat/mejoras-prioridad-alta`): secretos fuera del repo (`credenciales.txt`/`test.txt`), `trust proxy` en el backend, manejo de errores en el frontend (`QueryError` + `ErrorBoundary` + `isError` en todas las páginas de datos), y code splitting (lazy routes + Suspense). Verificado con typecheck backend y build frontend. Detalle en "Última tarea realizada".

# Notas para futuras sesiones

- **Entorno:** contenedores `kyc_db` + `kyc_backend` (Docker Compose). Vite dev en `5173`, API en `4000`.
- **BD local:** base `kyc_db`, usuario `kyc_user`. (Contraseña en la configuración local; no se registra aquí.)
- **Usuarios de prueba:** `admin@kyc.local` (admin), `juan@test.com` (cliente), `ana@test.com` (compliance), `direccion@test.com` (direccion). Contraseñas de test en el entorno local.
- **Login:** el campo es `identifier` (email o username) + `password`, NO `email`. El cliente entra por email; el username es interno (autogenerado del email en el alta).
- **Alta de cliente (ya no hay registro):** `POST /users/clients` (admin) → devuelve `activationToken`; enlace `${origin}/activate?token=...`. El cliente activa en `/activate`.
- **Aplicar migraciones:** `Get-Content db/init/XX.sql | docker exec -i kyc_db psql -U kyc_user -d kyc_db`. Aplicadas hasta `10_chat_advanced.sql`.
- **SSE (chat en vivo):** `EventSource` requiere cookie de sesión → `withCredentials: true` en el cliente y CORS con origin específico + `credentials`. En PowerShell, probar con `curl.exe -N --max-time N` (termina con exit 28 por el timeout, es esperado).
- **Rebuild backend:** `docker compose up -d --build backend`.
- **Verificación:** backend `npx tsc --noEmit`; frontend `npm run build` (hace `tsc --noEmit && vite build`).
- **Quirks PowerShell 5.1 para tests con curl.exe:** usar `@(...)` para `.Count`; escribir cuerpos JSON a fichero y usar `--data-binary "@fichero"`; `dangerouslyDisableSandbox: true` en comandos con rutas tipo `/decision`, `/review`, `/start-review` o `/activate`.
- **Regla del proyecto:** mantener este `CLAUDE.md` actualizado al final de cada tarea importante (crear/ampliar, nunca borrar decisiones; marcarlas como reemplazadas).
