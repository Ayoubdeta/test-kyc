import type { PoolClient } from 'pg';
import type { DocumentEventType, DocumentTypeKey } from '../config/constants';
import { pool, query } from '../database/pool';
import type { DocumentEventRow } from '../types';

// Ejecutor: el pool por defecto o un cliente de transacción (para que el evento
// de auditoría sea atómico con el cambio de estado del documento).
type Executor = Pick<PoolClient, 'query'>;

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
  async create(params: CreateEventParams, client?: Executor): Promise<DocumentEventRow> {
    const executor = client ?? pool;
    const result = await executor.query<DocumentEventRow>(
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
    return result.rows[0];
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
