-- =============================================================
-- KYC — Todas las migraciones concatenadas para Supabase
-- Pega TODO este fichero en el SQL Editor de Supabase y ejecútalo.
-- Son idempotentes: se pueden re-ejecutar sin romper nada.
-- =============================================================


-- ---------- 01_schema.sql ----------
-- ════════════════════════════════════════════════════════════════
--  Esquema inicial de la base de datos (KYC)
--  Se ejecuta automáticamente la primera vez que se crea el volumen
--  de Postgres (carpeta /docker-entrypoint-initdb.d).
-- ════════════════════════════════════════════════════════════════

-- pgcrypto aporta gen_random_uuid() para generar UUIDs como PK.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Tabla principal de usuarios ───────────────────────────────
-- Guarda las credenciales. La contraseña se almacena SIEMPRE hasheada
-- (bcrypt), nunca en texto plano.
CREATE TABLE IF NOT EXISTS users (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    username       VARCHAR(50)  NOT NULL UNIQUE,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  TEXT         NOT NULL,
    last_login_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- Validaciones de integridad a nivel de base de datos (defensa en profundidad).
    CONSTRAINT chk_username_len CHECK (char_length(username) >= 3),
    CONSTRAINT chk_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- ─── Tabla de perfil (datos adicionales del usuario) ───────────
-- Relación 1:1 con users. La PK es también FK, garantizando un
-- único perfil por usuario. ON DELETE CASCADE: si se borra el
-- usuario, su perfil desaparece con él.
CREATE TABLE IF NOT EXISTS profiles (
    user_id     UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name   VARCHAR(150),
    phone       VARCHAR(30),
    address     VARCHAR(255),
    birth_date  DATE,
    bio         TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── Tabla de refresh tokens ───────────────────────────────────
-- Permite renovar la sesión sin re-login y, sobre todo, poder
-- REVOCAR sesiones (logout real). Se guarda solo el HASH del token,
-- nunca el valor en claro.
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT         NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Índices para las búsquedas frecuentes (por usuario y por hash de token).
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id    ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);

-- ─── Trigger para mantener updated_at automáticamente ──────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- 02_roles_documents.sql ----------
-- ════════════════════════════════════════════════════════════════
--  Migración: roles de usuario + documentos (KYC)
--  - Añade la columna "role" a users (admin | cliente | compliance).
--  - Crea la tabla "documents" con su estado de revisión.
--  Idempotente: puede ejecutarse sobre una BD ya existente.
-- ════════════════════════════════════════════════════════════════

-- ─── Rol de usuario ────────────────────────────────────────────
-- Por defecto todos son 'cliente'. Los roles admin/compliance se
-- asignan después (seed inicial o desde el panel de administración).
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'cliente';

-- CHECK del rol (se crea solo si no existe todavía).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_role'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_role
            CHECK (role IN ('admin', 'cliente', 'compliance'));
    END IF;
END $$;

-- ─── Documentos subidos por los clientes ───────────────────────
-- El binario del PDF se guarda como fichero en disco (volumen Docker);
-- aquí solo persistimos los metadatos y el estado de revisión KYC.
CREATE TABLE IF NOT EXISTS documents (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_name  VARCHAR(255) NOT NULL,   -- nombre original del fichero
    stored_name    VARCHAR(255) NOT NULL,   -- nombre único en disco
    mime_type      VARCHAR(100) NOT NULL,
    size_bytes     BIGINT       NOT NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'pendiente',
    review_comment TEXT,
    reviewed_by    UUID         REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at    TIMESTAMPTZ,
    uploaded_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_documents_status CHECK (status IN ('pendiente', 'aprobado', 'rechazado'))
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status  ON documents (status);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents (uploaded_at DESC);


-- ---------- 03_doctypes_notifications.sql ----------
-- ════════════════════════════════════════════════════════════════
--  Migración: tipos de documento KYC + validez + notificaciones
--  Idempotente: puede ejecutarse sobre una BD ya existente.
-- ════════════════════════════════════════════════════════════════

-- ─── Tipo de documento y validez en documents ──────────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS doc_type   VARCHAR(50);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Restringe doc_type a los 7 tipos KYC admitidos (permite NULL para docs antiguos).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_documents_type') THEN
        ALTER TABLE documents ADD CONSTRAINT chk_documents_type CHECK (
            doc_type IS NULL OR doc_type IN (
                'dni_representante',
                'cif_empresa',
                'escritura_constitucion',
                'poderes_representante',
                'certificado_titularidad_bancaria',
                'declaracion_titularidad_real',
                'contrato_decal'
            )
        );
    END IF;
END $$;

-- Un único documento activo por (usuario, tipo): re-subir reemplaza.
CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_user_type
    ON documents (user_id, doc_type)
    WHERE doc_type IS NOT NULL;

-- ─── Notificaciones ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         VARCHAR(40)  NOT NULL,
    title        VARCHAR(150) NOT NULL,
    message      TEXT         NOT NULL,
    document_id  UUID         REFERENCES documents(id) ON DELETE SET NULL,
    read_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
    ON notifications (user_id, created_at DESC);


-- ---------- 04_document_events.sql ----------
-- ════════════════════════════════════════════════════════════════
--  Migración: historial de eventos de documentos (auditoría KYC)
--  Registro inmutable de cada acción sobre un documento (subido,
--  aprobado, rechazado, caducado). Es independiente de las
--  notificaciones (que el cliente puede borrar) y sobrevive al
--  reemplazo del documento: así el historial nunca se pierde.
--  Idempotente: puede ejecutarse sobre una BD ya existente.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS document_events (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Propietario (cliente) del documento; el historial es suyo.
    user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Documento asociado; si se elimina, conservamos el evento (SET NULL).
    document_id   UUID         REFERENCES documents(id) ON DELETE SET NULL,
    doc_type      VARCHAR(50),
    original_name VARCHAR(255),
    event_type    VARCHAR(20)  NOT NULL,
    comment       TEXT,
    expires_at    TIMESTAMPTZ,
    -- Quién realizó la acción (revisor); NULL para eventos del sistema.
    actor_id      UUID         REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_document_events_type CHECK (
        event_type IN ('subido', 'aprobado', 'rechazado', 'caducado')
    )
);

CREATE INDEX IF NOT EXISTS idx_document_events_user
    ON document_events (user_id, created_at DESC);


-- ---------- 05_workflow_direccion.sql ----------
-- ════════════════════════════════════════════════════════════════
--  Migración: rol Dirección General + flujo de aprobación por etapas
--  - users.role admite 'direccion'.
--  - documents.status admite 'en_revision'.
--  - documents gana decided_by / decided_at (decisión de dirección).
--  - document_events.event_type admite 'revisado'.
--  Idempotente: puede ejecutarse sobre una BD ya existente.
-- ════════════════════════════════════════════════════════════════

-- ─── Rol de usuario: añadir 'direccion' ────────────────────────
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE users
    ADD CONSTRAINT chk_users_role
    CHECK (role IN ('admin', 'cliente', 'compliance', 'direccion'));

-- ─── Estado del documento: añadir 'en_revision' ────────────────
ALTER TABLE documents DROP CONSTRAINT IF EXISTS chk_documents_status;
ALTER TABLE documents
    ADD CONSTRAINT chk_documents_status
    CHECK (status IN ('pendiente', 'en_revision', 'aprobado', 'rechazado'));

-- ─── Decisión de Dirección General ─────────────────────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS decided_by UUID
    REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;

-- ─── Evento de auditoría 'revisado' ────────────────────────────
ALTER TABLE document_events DROP CONSTRAINT IF EXISTS chk_document_events_type;
ALTER TABLE document_events
    ADD CONSTRAINT chk_document_events_type
    CHECK (event_type IN ('subido', 'revisado', 'aprobado', 'rechazado', 'caducado'));


-- ---------- 06_chat.sql ----------
-- ════════════════════════════════════════════════════════════════
--  Migración: chat cliente ↔ personal (compliance/admin)
--  Cada conversación pertenece a un cliente (client_id). Los mensajes
--  los escribe el propio cliente o el personal interno (sender_role).
--  read_at marca cuándo lo leyó la otra parte.
--  Idempotente.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS chat_messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Cliente dueño de la conversación (agrupa el hilo).
    client_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Autor real del mensaje (cliente o un miembro del personal).
    sender_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_role VARCHAR(10) NOT NULL,
    body        TEXT        NOT NULL,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_chat_sender_role CHECK (sender_role IN ('cliente', 'staff'))
);

CREATE INDEX IF NOT EXISTS idx_chat_client
    ON chat_messages (client_id, created_at);


-- ---------- 07_review_approval_state.sql ----------
-- ════════════════════════════════════════════════════════════════
--  Migración: separar "en revisión" (compliance/admin) de
--  "pendiente de aprobación" (a la espera de Dirección).
--
--  Flujo nuevo:
--    pendiente
--      → en_revision            (compliance/admin al pulsar "Ver")
--        → pendiente_aprobacion (compliance/admin: "Enviar a aprobación")
--          → aprobado | rechazado (Dirección)
--        → rechazado            (compliance/admin: "Cancelar")
--
--  Antes, 'en_revision' significaba "enviado a Dirección". Ese significado
--  pasa ahora a 'pendiente_aprobacion'. Idempotente en la parte DDL.
--  La migración de datos es de UNA SOLA EJECUCIÓN (ver nota abajo).
-- ════════════════════════════════════════════════════════════════

-- ─── Estado del documento: añadir 'pendiente_aprobacion' ───────────
ALTER TABLE documents DROP CONSTRAINT IF EXISTS chk_documents_status;
ALTER TABLE documents
    ADD CONSTRAINT chk_documents_status
    CHECK (status IN ('pendiente', 'en_revision', 'pendiente_aprobacion', 'aprobado', 'rechazado'));

-- ─── Migración de datos (ejecutar una sola vez) ────────────────────
-- Los documentos que estaban en 'en_revision' bajo el flujo anterior ya
-- habían sido revisados y esperaban la decisión de Dirección: eso es ahora
-- 'pendiente_aprobacion'. Se migran solo los que aún NO tienen decisión de
-- Dirección (decided_at IS NULL), que son exactamente los que esperaban.
UPDATE documents
   SET status = 'pendiente_aprobacion'
 WHERE status = 'en_revision'
   AND decided_at IS NULL;


-- ---------- 08_client_onboarding.sql ----------
-- ════════════════════════════════════════════════════════════════
--  Migración: alta de clientes por personal interno + activación.
--  - El cliente ya NO se auto-registra: lo crea un usuario interno.
--  - password_hash pasa a ser opcional (el cliente la fija al activar).
--  - Se añade token de activación (solo su hash) y su caducidad.
--  - Nueva tabla client_profiles = expediente del cliente (empresa).
--  Idempotente.
-- ════════════════════════════════════════════════════════════════

-- La contraseña ya no es obligatoria al crear el usuario: el cliente la
-- establece al activar su cuenta mediante el enlace de invitación.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Token de activación de la cuenta (se guarda solo el hash) y su caducidad.
ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_token_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_activation_token ON users (activation_token_hash);

-- ─── Expediente del cliente (empresa) ──────────────────────────
-- Relación 1:1 con users. En la Fase 1 solo se rellena la información
-- mínima (razón social, CIF, tipo, comercial); el resto de campos se
-- completan en el asistente de onboarding (fases posteriores).
CREATE TABLE IF NOT EXISTS client_profiles (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    client_type         VARCHAR(20) NOT NULL DEFAULT 'empresa'
        CHECK (client_type IN ('empresa', 'autonomo', 'particular')),
    expediente_status   VARCHAR(30) NOT NULL DEFAULT 'pendiente_completar'
        CHECK (expediente_status IN
            ('pendiente_completar', 'enviado', 'en_revision', 'aprobado', 'rechazado', 'activo')),
    risk_level          VARCHAR(10) CHECK (risk_level IN ('bajo', 'medio', 'alto')),
    comercial_asignado  VARCHAR(120),

    -- Información básica de la empresa
    razon_social        VARCHAR(150) NOT NULL,
    cif                 VARCHAR(20),
    nombre_comercial    VARCHAR(150),
    forma_juridica      VARCHAR(80),
    fecha_constitucion  DATE,
    sector_actividad    VARCHAR(120),
    cnae                VARCHAR(20),
    num_empleados       INTEGER,
    pagina_web          VARCHAR(255),

    -- Dirección fiscal
    fiscal_pais         VARCHAR(80),
    fiscal_provincia    VARCHAR(80),
    fiscal_ciudad       VARCHAR(80),
    fiscal_cp           VARCHAR(20),
    fiscal_direccion    VARCHAR(255),

    -- Representante legal
    rep_nombre           VARCHAR(80),
    rep_apellidos        VARCHAR(120),
    rep_cargo            VARCHAR(80),
    rep_documento        VARCHAR(40),
    rep_fecha_nacimiento DATE,
    rep_nacionalidad     VARCHAR(80),
    rep_email            VARCHAR(255),
    rep_telefono         VARCHAR(30),

    -- Persona de contacto
    contacto_nombre     VARCHAR(120),
    contacto_cargo      VARCHAR(80),
    contacto_email      VARCHAR(255),
    contacto_telefono   VARCHAR(30),

    -- Datos bancarios
    banco_titular       VARCHAR(150),
    iban                VARCHAR(40),
    swift               VARCHAR(20),

    -- Información KYC
    kyc_residencia_fiscal      VARCHAR(80),
    kyc_beneficiario_efectivo  TEXT,
    kyc_es_pep                 BOOLEAN,
    kyc_origen_fondos          TEXT,
    kyc_declaraciones          TEXT,

    -- Aceptaciones (activación) y envío del expediente
    privacy_accepted_at TIMESTAMPTZ,
    terms_accepted_at   TIMESTAMPTZ,
    submitted_at        TIMESTAMPTZ,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para mantener updated_at (reutiliza la función ya existente).
DROP TRIGGER IF EXISTS trg_client_profiles_updated_at ON client_profiles;
CREATE TRIGGER trg_client_profiles_updated_at
    BEFORE UPDATE ON client_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------- 09_activity_logs.sql ----------
-- ════════════════════════════════════════════════════════════════
--  Migración: log de actividad de la aplicación (auditoría global)
--  Registro append-only de las acciones relevantes de TODA la
--  plataforma (auth, altas, activaciones, subidas, revisiones y
--  decisiones). Lo consulta únicamente el administrador.
--
--  Se diferencia de `document_events` (historial funcional de un
--  documento, visible por el cliente) en que este log es transversal
--  y técnico: quién hizo qué, cuándo y desde qué IP.
--
--  Idempotente: puede ejecutarse sobre una BD ya existente.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activity_logs (
    id          BIGSERIAL    PRIMARY KEY,
    -- Autor de la acción. SET NULL si se elimina el usuario: el log
    -- sobrevive (conservamos actor_label para saber quién fue).
    actor_id    UUID         REFERENCES users(id) ON DELETE SET NULL,
    actor_role  VARCHAR(20),
    -- Etiqueta legible del actor (email/usuario) desnormalizada, para
    -- que el log siga siendo entendible aunque el usuario ya no exista.
    actor_label VARCHAR(255),
    -- Acción realizada (namespaced): 'auth.login', 'document.approved'…
    action      VARCHAR(50)  NOT NULL,
    -- Entidad afectada (tipo + id), opcional.
    entity_type VARCHAR(30),
    entity_id   VARCHAR(255),
    -- Descripción legible en español para mostrar directamente.
    description TEXT,
    -- Datos estructurados adicionales (motivo, identifier intentado…).
    metadata    JSONB,
    ip          VARCHAR(64),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Índices para el listado (orden cronológico) y los filtros por actor/acción.
CREATE INDEX IF NOT EXISTS idx_activity_logs_created
    ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor
    ON activity_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action
    ON activity_logs (action, created_at DESC);


-- ---------- 10_chat_advanced.sql ----------
-- ════════════════════════════════════════════════════════════════
--  Migración: chat avanzado
--  Amplía chat_messages con:
--   - reply_to_id: responder/citar a otro mensaje del hilo.
--   - edited_at / deleted_at: edición y borrado (soft delete).
--   - attachment_*: adjuntos (PDF/imagen) guardados en disco.
--   - reactions: reacciones emoji { "👍": ["userId", ...], ... }.
--  El indicador "escribiendo…" y los ticks de lectura en vivo NO
--  necesitan columnas: van por SSE (typing) y por read_at (ya existía).
--  Idempotente.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS reply_to_id       UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS edited_at         TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_at        TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS attachment_name   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS attachment_stored VARCHAR(255),
    ADD COLUMN IF NOT EXISTS attachment_mime   VARCHAR(100),
    ADD COLUMN IF NOT EXISTS attachment_size   BIGINT,
    ADD COLUMN IF NOT EXISTS reactions         JSONB;

-- Un mensaje puede ser solo-adjunto (sin texto): permitimos body vacío.
-- (body sigue siendo NOT NULL; una cadena vacía es válida.)



-- ════════════════════════════════════════════════════════════════
--  11 · Preferencia de idioma por usuario (i18n)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'es';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_language;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_language
    CHECK (language IN ('es', 'ca', 'en', 'de', 'fr', 'ar', 'zh'));

-- ════════════════════════════════════════════════════════════════
--  12 · Validez (meses) propuesta por el revisor al enviar a aprobación
-- ════════════════════════════════════════════════════════════════

ALTER TABLE documents ADD COLUMN IF NOT EXISTS validity_months INTEGER;

ALTER TABLE documents DROP CONSTRAINT IF EXISTS chk_documents_validity_months;
ALTER TABLE documents ADD CONSTRAINT chk_documents_validity_months
    CHECK (validity_months IS NULL OR (validity_months >= 1 AND validity_months <= 120));
