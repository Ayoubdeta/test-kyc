import type { DocumentEventType, DocumentTypeKey } from '../config/constants';
import { query } from '../database/pool';
import type { DocumentEventRow } from '../types';

interface CreateEventParams {
  userId: string;
  documentId: string | null;
  docType: DocumentTypeKey | null;
  originalName: string | null;
  eventType: DocumentEventType;
  comment?: string | null;
  expiresAt?: Date | null;
  actorId?: string | null;
}

// Registro de auditoría del historial de documentos. Es un log inmutable:
// solo se inserta y se lee (nunca se actualiza ni se borra desde la app).
export const documentEventRepository = {
  async create(params: CreateEventParams): Promise<DocumentEventRow> {
    const rows = await query<DocumentEventRow>(
      `INSERT INTO document_events
         (user_id, document_id, doc_type, original_name, event_type, comment, expires_at, actor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        params.userId,
        params.documentId,
        params.docType,
        params.originalName,
        params.eventType,
        params.comment ?? null,
        params.expiresAt ?? null,
        params.actorId ?? null,
      ],
    );
    return rows[0];
  },

  async listByUser(userId: string, limit = 100): Promise<DocumentEventRow[]> {
    return query<DocumentEventRow>(
      `SELECT * FROM document_events
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [userId, limit],
    );
  },
};
