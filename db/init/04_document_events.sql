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
