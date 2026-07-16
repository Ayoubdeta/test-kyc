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
