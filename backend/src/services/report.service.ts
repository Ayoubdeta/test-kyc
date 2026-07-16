import {
  REPORT_LIMIT,
  reportRepository,
  type ReportFilters,
  type ReportRowRaw,
} from '../repositories/report.repository';
import type { ReportRow } from '../types';
import { docTypeLabel } from '../utils/mappers';

function toIso(value: Date | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

function mapRow(row: ReportRowRaw): ReportRow {
  return {
    documentId: row.documentId,
    clientId: row.clientId,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    docType: row.docType,
    docLabel: docTypeLabel(row.docType),
    originalName: row.originalName,
    status: row.status,
    uploadedAt: new Date(row.uploadedAt).toISOString(),
    reviewedAt: toIso(row.reviewedAt),
    reviewerName: row.reviewerName,
    decidedAt: toIso(row.decidedAt),
    deciderName: row.deciderName,
    expiresAt: toIso(row.expiresAt),
    comment: row.comment,
  };
}

export const reportService = {
  /** Informe detallado de documentos con filtros + un resumen agregado. */
  async documents(filters: ReportFilters) {
    const raw = await reportRepository.documents(filters);

    // Pedimos REPORT_LIMIT+1 al repositorio: si nos devuelve de más, hubo
    // truncamiento y lo señalamos para que la UI avise.
    const truncated = raw.length > REPORT_LIMIT;
    const rows = (truncated ? raw.slice(0, REPORT_LIMIT) : raw).map(mapRow);

    // Resumen por estado (útil como cabecera del informe y para el CSV).
    const byStatus: Record<string, number> = {};
    for (const r of rows) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    }

    return {
      filters,
      rows,
      total: rows.length,
      truncated,
      limit: REPORT_LIMIT,
      summary: {
        byStatus,
        // "Cancelados/rechazados" es lo que el usuario quiere destacar.
        rechazados: byStatus.rechazado ?? 0,
        aprobados: byStatus.aprobado ?? 0,
      },
    };
  },
};
