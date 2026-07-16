-- ════════════════════════════════════════════════════════════════
--  Migración: separar "en revisión" (compliance/admin) de
--  "pendiente de aprobación" (a la espera de Dirección).
--
--  Flujo nuevo:
--    pendiente
--      → en_revision            (compliance/admin al pulsar "Ver")
--        → pendiente_aprobacion (compliance/admin: "Enviar a aprobación")
--          → aprobado | rechazado (Dirección)
--        → rechazado            (compliance/admin: "Cancelar")
--
--  Antes, 'en_revision' significaba "enviado a Dirección". Ese significado
--  pasa ahora a 'pendiente_aprobacion'. Idempotente en la parte DDL.
--  La migración de datos es de UNA SOLA EJECUCIÓN (ver nota abajo).
-- ════════════════════════════════════════════════════════════════

-- ─── Estado del documento: añadir 'pendiente_aprobacion' ───────────
ALTER TABLE documents DROP CONSTRAINT IF EXISTS chk_documents_status;
ALTER TABLE documents
    ADD CONSTRAINT chk_documents_status
    CHECK (status IN ('pendiente', 'en_revision', 'pendiente_aprobacion', 'aprobado', 'rechazado'));

-- ─── Migración de datos (ejecutar una sola vez) ────────────────────
-- Los documentos que estaban en 'en_revision' bajo el flujo anterior ya
-- habían sido revisados y esperaban la decisión de Dirección: eso es ahora
-- 'pendiente_aprobacion'. Se migran solo los que aún NO tienen decisión de
-- Dirección (decided_at IS NULL), que son exactamente los que esperaban.
UPDATE documents
   SET status = 'pendiente_aprobacion'
 WHERE status = 'en_revision'
   AND decided_at IS NULL;
