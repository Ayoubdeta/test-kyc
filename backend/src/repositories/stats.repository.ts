import type { DocumentTypeKey, DocumentStatus } from '../config/constants';
import { query } from '../database/pool';

// Expresión SQL del estado EFECTIVO (caducado = aprobado + vencido).
const EFF_STATUS = `
  CASE
    WHEN d.status = 'aprobado' AND d.expires_at IS NOT NULL AND d.expires_at < now()
      THEN 'caducado'
    ELSE d.status
  END`;

export interface StatsFilters {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD (inclusive)
  docType?: DocumentTypeKey;
  status?: DocumentStatus;
}

export interface OverviewRow {
  enviados_este_ano: number;
  pendientes: number;
  en_revision: number;
  pendiente_aprobacion: number;
  aprobados: number;
  caducados: number;
  rechazados: number;
  total: number;
}

// Construye el WHERE parametrizado a partir de los filtros. Traduce el filtro
// de estado "efectivo" (aprobado vigente vs caducado) a condiciones reales.
function buildWhere(filters: StatsFilters): { where: string; params: unknown[] } {
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
    if (filters.status === 'caducado') {
      conds.push(`d.status = 'aprobado' AND d.expires_at IS NOT NULL AND d.expires_at < now()`);
    } else if (filters.status === 'aprobado') {
      conds.push(`d.status = 'aprobado' AND (d.expires_at IS NULL OR d.expires_at >= now())`);
    } else {
      params.push(filters.status);
      conds.push(`d.status = $${params.length}`);
    }
  }

  return { where: conds.length ? `WHERE ${conds.join(' AND ')}` : '', params };
}

export const statsRepository = {
  /** KPIs de cabecera para el panel (snapshot actual + enviados este año). */
  async overview(): Promise<OverviewRow> {
    const rows = await query<OverviewRow>(
      `SELECT
         count(*) FILTER (WHERE uploaded_at >= date_trunc('year', now()))::int AS enviados_este_ano,
         count(*) FILTER (WHERE status = 'pendiente')::int AS pendientes,
         count(*) FILTER (WHERE status = 'en_revision')::int AS en_revision,
         count(*) FILTER (WHERE status = 'pendiente_aprobacion')::int AS pendiente_aprobacion,
         count(*) FILTER (WHERE status = 'aprobado'
             AND (expires_at IS NULL OR expires_at >= now()))::int AS aprobados,
         count(*) FILTER (WHERE status = 'aprobado'
             AND expires_at IS NOT NULL AND expires_at < now())::int AS caducados,
         count(*) FILTER (WHERE status = 'rechazado')::int AS rechazados,
         count(*)::int AS total
       FROM documents`,
    );
    return rows[0];
  },

  /** Documentos subidos por mes del año en curso (para la mini-gráfica). */
  async monthlyThisYear(): Promise<{ month: number; uploaded: number }[]> {
    return query<{ month: number; uploaded: number }>(
      `SELECT extract(month from uploaded_at)::int AS month, count(*)::int AS uploaded
         FROM documents
        WHERE uploaded_at >= date_trunc('year', now())
        GROUP BY 1
        ORDER BY 1`,
    );
  },

  async total(filters: StatsFilters): Promise<number> {
    const { where, params } = buildWhere(filters);
    const rows = await query<{ count: number }>(
      `SELECT count(*)::int AS count FROM documents d ${where}`,
      params,
    );
    return rows[0]?.count ?? 0;
  },

  async byStatus(filters: StatsFilters): Promise<{ status: string; count: number }[]> {
    const { where, params } = buildWhere(filters);
    return query<{ status: string; count: number }>(
      `SELECT ${EFF_STATUS} AS status, count(*)::int AS count
         FROM documents d ${where}
        GROUP BY 1`,
      params,
    );
  },

  async byType(filters: StatsFilters): Promise<{ docType: string; count: number }[]> {
    const { where, params } = buildWhere(filters);
    return query<{ docType: string; count: number }>(
      `SELECT COALESCE(d.doc_type, 'otro') AS "docType", count(*)::int AS count
         FROM documents d ${where}
        GROUP BY 1
        ORDER BY count DESC`,
      params,
    );
  },

  async byMonth(filters: StatsFilters): Promise<{ month: string; uploaded: number }[]> {
    const { where, params } = buildWhere(filters);
    return query<{ month: string; uploaded: number }>(
      `SELECT to_char(date_trunc('month', d.uploaded_at), 'YYYY-MM') AS month,
              count(*)::int AS uploaded
         FROM documents d ${where}
        GROUP BY 1
        ORDER BY 1`,
      params,
    );
  },

  async byUser(filters: StatsFilters): Promise<
    {
      userId: string;
      name: string;
      email: string;
      total: number;
      pendiente: number;
      en_revision: number;
      pendiente_aprobacion: number;
      aprobado: number;
      caducado: number;
      rechazado: number;
    }[]
  > {
    const { where, params } = buildWhere(filters);
    return query(
      `SELECT d.user_id AS "userId",
              COALESCE(p.full_name, u.username) AS name,
              u.email AS email,
              count(*)::int AS total,
              count(*) FILTER (WHERE d.status = 'pendiente')::int AS pendiente,
              count(*) FILTER (WHERE d.status = 'en_revision')::int AS en_revision,
              count(*) FILTER (WHERE d.status = 'pendiente_aprobacion')::int AS pendiente_aprobacion,
              count(*) FILTER (WHERE d.status = 'aprobado'
                  AND (d.expires_at IS NULL OR d.expires_at >= now()))::int AS aprobado,
              count(*) FILTER (WHERE d.status = 'aprobado'
                  AND d.expires_at IS NOT NULL AND d.expires_at < now())::int AS caducado,
              count(*) FILTER (WHERE d.status = 'rechazado')::int AS rechazado
         FROM documents d
         JOIN users u ON u.id = d.user_id
         LEFT JOIN profiles p ON p.user_id = d.user_id
         ${where}
        GROUP BY d.user_id, name, u.email
        ORDER BY total DESC`,
      params,
    );
  },
};
