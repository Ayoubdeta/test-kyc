-- ════════════════════════════════════════════════════════════════
--  Preferencia de idioma por usuario (i18n)
--  Añade la columna `language` al perfil. Idempotente.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'es';

-- Restringe a los idiomas soportados (defensa en profundidad, además del
-- validador Zod en la API). Se recrea para poder ampliarlo en el futuro.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_language;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_language
    CHECK (language IN ('es', 'ca', 'en', 'de', 'fr', 'ar', 'zh'));
