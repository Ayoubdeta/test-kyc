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
