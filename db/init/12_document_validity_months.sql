-- 12_document_validity_months.sql
-- La validez (en meses) del documento la PROPONE ahora el revisor (admin/compliance)
-- al enviarlo a aprobación; Dirección puede ajustarla al aprobar. Se guarda en el
-- documento para poder calcular `expires_at` en el momento de la aprobación
-- (la caducidad cuenta desde que Dirección aprueba, no desde el envío).
-- Idempotente.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS validity_months INTEGER;

ALTER TABLE documents DROP CONSTRAINT IF EXISTS chk_documents_validity_months;
ALTER TABLE documents ADD CONSTRAINT chk_documents_validity_months
  CHECK (validity_months IS NULL OR (validity_months >= 1 AND validity_months <= 120));
