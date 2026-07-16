-- ════════════════════════════════════════════════════════════════
--  Migración: tipos de documento KYC + validez + notificaciones
--  Idempotente: puede ejecutarse sobre una BD ya existente.
-- ════════════════════════════════════════════════════════════════

-- ─── Tipo de documento y validez en documents ──────────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS doc_type   VARCHAR(50);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Restringe doc_type a los 7 tipos KYC admitidos (permite NULL para docs antiguos).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_documents_type') THEN
        ALTER TABLE documents ADD CONSTRAINT chk_documents_type CHECK (
            doc_type IS NULL OR doc_type IN (
                'dni_representante',
                'cif_empresa',
                'escritura_constitucion',
                'poderes_representante',
                'certificado_titularidad_bancaria',
                'declaracion_titularidad_real',
                'contrato_decal'
            )
        );
    END IF;
END $$;

-- Un único documento activo por (usuario, tipo): re-subir reemplaza.
CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_user_type
    ON documents (user_id, doc_type)
    WHERE doc_type IS NOT NULL;

-- ─── Notificaciones ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         VARCHAR(40)  NOT NULL,
    title        VARCHAR(150) NOT NULL,
    message      TEXT         NOT NULL,
    document_id  UUID         REFERENCES documents(id) ON DELETE SET NULL,
    read_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
    ON notifications (user_id, created_at DESC);
