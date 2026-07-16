import type { LogAction, Role } from '../config/constants';
import { query } from '../database/pool';
import type { ActivityLogRow } from '../types';

export interface CreateLogParams {
  actorId?: string | null;
  actorRole?: Role | null;
  actorLabel?: string | null;
  action: LogAction;
  entityType?: string | null;
  entityId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

export interface LogFilters {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD (inclusivo)
  action?: LogAction;
  actorId?: string;
  search?: string; // busca en actor_label / description
}

// Construye el WHERE parametrizado de los filtros del listado de logs.
function buildWhere(filters: LogFilters): { where: string; params: unknown[] } {
  const conds: string[] = [];
  const params: unknown[] = [];

  if (filters.from) {
    params.push(filters.from);
    conds.push(`created_at >= $${params.length}::date`);
  }
  if (filters.to) {
    params.push(filters.to);
    conds.push(`created_at < ($${params.length}::date + interval '1 day')`);
  }
  if (filters.action) {
    params.push(filters.action);
    conds.push(`action = $${params.length}`);
  }
  if (filters.actorId) {
    params.push(filters.actorId);
    conds.push(`actor_id = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conds.push(`(actor_label ILIKE $${params.length} OR description ILIKE $${params.length})`);
  }

  return { where: conds.length ? `WHERE ${conds.join(' AND ')}` : '', params };
}

// Log de auditoría global: solo se inserta y se lee (append-only). Nunca se
// actualiza ni se borra desde la aplicación.
export const activityLogRepository = {
  async create(params: CreateLogParams): Promise<void> {
    await query(
      `INSERT INTO activity_logs
         (actor_id, actor_role, actor_label, action, entity_type, entity_id, description, metadata, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.actorId ?? null,
        params.actorRole ?? null,
        params.actorLabel ?? null,
        params.action,
        params.entityType ?? null,
        params.entityId ?? null,
        params.description ?? null,
        params.metadata ? JSON.stringify(params.metadata) : null,
        params.ip ?? null,
      ],
    );
  },

  async count(filters: LogFilters): Promise<number> {
    const { where, params } = buildWhere(filters);
    const rows = await query<{ count: number }>(
      `SELECT count(*)::int AS count FROM activity_logs ${where}`,
      params,
    );
    return rows[0]?.count ?? 0;
  },

  async list(filters: LogFilters, limit: number, offset: number): Promise<ActivityLogRow[]> {
    const { where, params } = buildWhere(filters);
    params.push(limit, offset);
    return query<ActivityLogRow>(
      `SELECT * FROM activity_logs
         ${where}
        ORDER BY created_at DESC, id DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
  },
};
