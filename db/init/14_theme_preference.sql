-- ════════════════════════════════════════════════════════════════
--  Preferencia de tema por usuario (modo claro / oscuro / automático)
--  Añade la columna `theme` al perfil. Idempotente.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS theme VARCHAR(10) NOT NULL DEFAULT 'system';

-- Restringe a los temas soportados (defensa en profundidad, además del
-- validador Zod en la API). Se recrea para poder ampliarlo en el futuro.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_theme;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_theme
    CHECK (theme IN ('light', 'dark', 'system'));
