import {
  activityLogRepository,
  type CreateLogParams,
  type LogFilters,
} from '../repositories/activityLog.repository';
import { toPublicActivityLog } from '../utils/mappers';

// Paginación del listado de logs. Un tope alto de pageSize evita descargas
// accidentales de toda la tabla desde el cliente.
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export const logService = {
  /**
   * Registra una acción en el log de auditoría. Es DELIBERADAMENTE tolerante a
   * fallos: la auditoría nunca debe tumbar la operación de negocio que la
   * origina. Si el insert falla, lo dejamos en consola y seguimos.
   *
   * Se invoca sin `await` desde los controladores (fire-and-forget): como aquí
   * capturamos cualquier error, nunca produce un rechazo sin manejar.
   */
  async record(params: CreateLogParams): Promise<void> {
    try {
      await activityLogRepository.create(params);
    } catch (error) {
      console.error('[activity-log] No se pudo registrar la acción:', params.action, error);
    }
  },

  /** Listado paginado y filtrable de logs (solo admin). */
  async list(filters: LogFilters, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeSize = Math.min(
      Math.max(Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE,
    );
    const offset = (safePage - 1) * safeSize;

    const [total, rows] = await Promise.all([
      activityLogRepository.count(filters),
      activityLogRepository.list(filters, safeSize, offset),
    ]);

    return {
      logs: rows.map(toPublicActivityLog),
      total,
      page: safePage,
      pageSize: safeSize,
      totalPages: Math.max(1, Math.ceil(total / safeSize)),
    };
  },
};
