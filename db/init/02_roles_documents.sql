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
