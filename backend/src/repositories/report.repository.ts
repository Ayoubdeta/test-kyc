import type { DocumentStatus, DocumentTypeKey, StoredDocumentStatus } from '../config/constants';
import { query } from '../database/pool';

// Expresión SQL del estado EFECTIVO (caducado = aprobado + vencido). Igual que
// en stats: mantenemos la misma semántica de "caducado" en todo el sistema.
const EFF_STATUS = `
  CASE
    WHEN d.status = 'aprobado' AND d.expires_at IS NOT NULL AND d.expires_at < now()
      THEN 'caducado'
    ELSE d.status
  END`;

// Tope de filas por informe: evita descargar toda la tabla por accidente.
// Pedimos uno de más para detectar truncamiento y avisar en la UI.
export const REPORT_LIMIT = 5000;

export interface ReportFilters {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD (inclusivo)
  docType?: DocumentTypeKey;
  status?: DocumentStatus;
  clientId?: string;
  search?: string; // nombre/email del cliente
}

/** Fila cruda del informe (fechas como Date; el service las normaliza a ISO). */
export interface ReportRowRaw {
  documentId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  docType: DocumentTypeKey | null;
  originalName: string;
  status: StoredDocumentStatus | 'caducado';
  uploadedAt: Date;
  reviewedAt: Date | null;
  reviewerName: string | null;
  decidedAt: Date | null;
  deciderName: string | null;
  expiresAt: Date | null;
  comment: string | null;
}

function buildWhere(filters: ReportFilters): { where: string; params: unknown[] } {
  const conds: string[] = [];
  const params: unknown[] = [];

  if (filters.from) {
    params.push(filters.from);
    conds.push(`d.uploaded_at >= $${params.length}::date`);
  }
  if (filters.to) {
    params.push(filters.to);
    conds.push(`d.uploaded_at < ($${params.length}::date + interval '1 day')`);
  }
  if (filters.docType) {
    params.push(filters.docType);
    conds.push(`d.doc_type = $${params.length}`);
  }
  if (filters.status) {
    // Traducimos el estado efectivo (aprobado vigente vs caducado) a las
    // condiciones reales sobre la columna almacenada + fecha de validez.
    if (filters.status === 'caducado') {
      conds.push(`d.status = 'aprobado' AND d.expires_at IS NOT NULL AND d.expires_at < now()`);
    } else if (filters.status === 'aprobado') {
      conds.push(`d.status = 'aprobado' AND (d.expires_at IS NULL OR d.expires_at >= now())`);
    } else {
      params.push(filters.status);
      conds.push(`d.status = $${params.length}`);
    }
  }
  if (filters.clientId) {
    params.push(filters.clientId);
    conds.push(`d.user_id = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conds.push(
      `(u.email ILIKE $${params.length} OR u.username ILIKE $${params.length} OR p.full_name ILIKE $${params.length})`,
    );
  }

  return { where: conds.length ? `WHERE ${conds.join(' AND ')}` : '', params };
}

export const reportRepository = {
  /**
   * Detalle de documentos que cumplen los filtros: quién los envió, cuándo, su
   * estado efectivo, quién revisó/decidió y el motivo (comentario). Es la base
   * del informe "quién ha enviado de tal fecha a tal fecha y si se canceló".
   */
  async documents(filters: ReportFilters): Promise<ReportRowRaw[]> {
    const { where, params } = buildWhere(filters);
    params.push(REPORT_LIMIT + 1);
    return query<ReportRowRaw>(
      `SELECT
         d.id                              AS "documentId",
         d.user_id                         AS "clientId",
         COALESCE(p.full_name, u.username) AS "clientName",
         u.email                           AS "clientEmail",
         d.doc_type                        AS "docType",
         d.original_name                   AS "originalName",
         ${EFF_STATUS}                     AS status,
         d.uploaded_at                     AS "uploadedAt",
         d.reviewed_at                     AS "reviewedAt",
         COALESCE(rp.full_name, ru.username) AS "reviewerName",
         d.decided_at                      AS "decidedAt",
         COALESCE(dp.full_name, du.username) AS "deciderName",
         d.expires_at                      AS "expiresAt",
         d.review_comment                  AS comment
       FROM documents d
       JOIN users u        ON u.id = d.user_id
       LEFT JOIN profiles p  ON p.user_id = d.user_id
       LEFT JOIN users ru    ON ru.id = d.reviewed_by
       LEFT JOIN profiles rp ON rp.user_id = d.reviewed_by
       LEFT JOIN users du    ON du.id = d.decided_by
       LEFT JOIN profiles dp ON dp.user_id = d.decided_by
       ${where}
       ORDER BY d.uploaded_at DESC
       LIMIT $${params.length}`,
      params,
    );
  },
};
