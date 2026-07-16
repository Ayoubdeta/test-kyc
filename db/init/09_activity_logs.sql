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
