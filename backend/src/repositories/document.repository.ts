import type { DocumentTypeKey, StoredDocumentStatus } from '../config/constants';
import { NOTIFICATION_TYPE } from '../config/constants';
import { query } from '../database/pool';
import type { DocumentRow, DocumentWithOwnerRow } from '../types';

interface CreateDocumentParams {
  userId: string;
  docType: DocumentTypeKey;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
}

interface SendToReviewParams {
  reviewerId: string;
  comment: string | null;
}

interface DecideParams {
  status: StoredDocumentStatus; // aprobado | rechazado
  comment: string | null;
  deciderId: string;
  expiresAt: Date | null;
}

export const documentRepository = {
  async create(params: CreateDocumentParams): Promise<DocumentRow> {
    const rows = await query<DocumentRow>(
      `INSERT INTO documents (user_id, doc_type, original_name, stored_name, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        params.userId,
        params.docType,
        params.originalName,
        params.storedName,
        params.mimeType,
        params.sizeBytes,
      ],
    );
    return rows[0];
  },

  async findByUser(userId: string): Promise<DocumentRow[]> {
    return query<DocumentRow>(
      `SELECT * FROM documents WHERE user_id = $1 ORDER BY uploaded_at DESC`,
      [userId],
    );
  },

  async findByUserAndType(
    userId: string,
    docType: DocumentTypeKey,
  ): Promise<DocumentRow | null> {
    const rows = await query<DocumentRow>(
      `SELECT * FROM documents WHERE user_id = $1 AND doc_type = $2 LIMIT 1`,
      [userId, docType],
    );
    return rows[0] ?? null;
  },

  async findAllWithOwner(): Promise<DocumentWithOwnerRow[]> {
    return query<DocumentWithOwnerRow>(
      `SELECT d.*,
              u.username   AS owner_username,
              u.email      AS owner_email,
              p.full_name  AS owner_full_name
         FROM documents d
         JOIN users u    ON u.id = d.user_id
         LEFT JOIN profiles p ON p.user_id = d.user_id
        ORDER BY d.uploaded_at DESC`,
    );
  },

  async findById(id: string): Promise<DocumentRow | null> {
    const rows = await query<DocumentRow>(`SELECT * FROM documents WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async deleteById(id: string): Promise<void> {
    await query(`DELETE FROM documents WHERE id = $1`, [id]);
  },

  /** Compliance/Admin abren el documento para revisarlo (pendiente → en_revision). */
  async startReview(id: string, reviewerId: string): Promise<DocumentRow | null> {
    const rows = await query<DocumentRow>(
      `UPDATE documents
          SET status = 'en_revision',
              reviewed_by = $2,
              reviewed_at = now()
        WHERE id = $1
        RETURNING *`,
      [id, reviewerId],
    );
    return rows[0] ?? null;
  },

  /**
   * Compliance/Admin envían el documento a Dirección tras revisarlo
   * (en_revision → pendiente_aprobacion).
   */
  async sendToApproval(id: string, params: SendToReviewParams): Promise<DocumentRow | null> {
    const rows = await query<DocumentRow>(
      `UPDATE documents
          SET status = 'pendiente_aprobacion',
              reviewed_by = $2,
              reviewed_at = now(),
              review_comment = $3
        WHERE id = $1
        RETURNING *`,
      [id, params.reviewerId, params.comment],
    );
    return rows[0] ?? null;
  },

  /** Compliance/Admin rechazan en la fase de revisión (pendiente → rechazado). */
  async rejectByReviewer(id: string, params: SendToReviewParams): Promise<DocumentRow | null> {
    const rows = await query<DocumentRow>(
      `UPDATE documents
          SET status = 'rechazado',
              reviewed_by = $2,
              reviewed_at = now(),
              review_comment = $3,
              expires_at = NULL
        WHERE id = $1
        RETURNING *`,
      [id, params.reviewerId, params.comment],
    );
    return rows[0] ?? null;
  },

  /** Dirección decide (en_revision → aprobado/rechazado). */
  async decide(id: string, params: DecideParams): Promise<DocumentRow | null> {
    const rows = await query<DocumentRow>(
      `UPDATE documents
          SET status = $2,
              review_comment = $3,
              decided_by = $4,
              decided_at = now(),
              expires_at = $5
        WHERE id = $1
        RETURNING *`,
      [id, params.status, params.comment, params.deciderId, params.expiresAt],
    );
    return rows[0] ?? null;
  },

  /**
   * Documentos aprobados de un usuario que ya han caducado y para los que aún
   * no se ha generado la notificación de caducidad (para crearla de forma
   * perezosa, sin necesidad de un proceso programado).
   */
  async findExpiredWithoutNotification(userId: string): Promise<DocumentRow[]> {
    return query<DocumentRow>(
      `SELECT d.* FROM documents d
        WHERE d.user_id = $1
          AND d.status = 'aprobado'
          AND d.expires_at IS NOT NULL
          AND d.expires_at < now()
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
               WHERE n.document_id = d.id AND n.type = $2
          )`,
      [userId, NOTIFICATION_TYPE.DOC_EXPIRED],
    );
  },

  /**
   * Documentos aprobados de un usuario que están a punto de caducar (dentro de
   * los próximos `days` días, pero aún vigentes) y para los que todavía no se
   * ha generado el aviso previo. Se comprueba de forma perezosa al consultar.
   */
  async findExpiringWithoutNotification(
    userId: string,
    days: number,
  ): Promise<DocumentRow[]> {
    return query<DocumentRow>(
      `SELECT d.* FROM documents d
        WHERE d.user_id = $1
          AND d.status = 'aprobado'
          AND d.expires_at IS NOT NULL
          AND d.expires_at > now()
          AND d.expires_at <= now() + ($2 || ' days')::interval
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
               WHERE n.document_id = d.id AND n.type = $3
          )`,
      [userId, String(days), NOTIFICATION_TYPE.DOC_EXPIRING],
    );
  },
};
