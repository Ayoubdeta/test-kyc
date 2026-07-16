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
