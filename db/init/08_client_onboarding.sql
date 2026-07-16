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
