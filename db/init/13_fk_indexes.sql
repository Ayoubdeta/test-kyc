-- 13_fk_indexes.sql
-- Índices en claves foráneas y columnas de filtro que aún no los tenían.
-- Evitan escaneos secuenciales al borrar en cascada (SET NULL/CASCADE) y en las
-- colas de staff. Idempotente (IF NOT EXISTS). Barato con pocos datos, pero
-- previene locks/scans a medida que crecen las tablas.

-- notifications.document_id: FK ON DELETE SET NULL → al borrar un documento se
-- escanea notifications sin este índice.
CREATE INDEX IF NOT EXISTS idx_notifications_document_id ON notifications(document_id);

-- document_events: se consultan/afectan por documento y por actor.
CREATE INDEX IF NOT EXISTS idx_document_events_document_id ON document_events(document_id);
CREATE INDEX IF NOT EXISTS idx_document_events_actor_id ON document_events(actor_id);

-- documents: FKs de revisor/decisor (informes y borrados de usuarios).
CREATE INDEX IF NOT EXISTS idx_documents_reviewed_by ON documents(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_documents_decided_by ON documents(decided_by);

-- chat_messages: emisor y mensaje citado (respuestas).
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to_id ON chat_messages(reply_to_id);

-- client_profiles: filtro previsible por estado del expediente (colas de staff).
CREATE INDEX IF NOT EXISTS idx_client_profiles_expediente_status
  ON client_profiles(expediente_status);
