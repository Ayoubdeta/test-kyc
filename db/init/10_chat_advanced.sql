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
