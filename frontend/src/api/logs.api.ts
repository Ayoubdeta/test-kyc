import type { LogFilters, LogsResult } from '../types';
import { api } from './client';

export const logsApi = {
  /** Log de actividad paginado y filtrable (solo admin). */
  async list(filters: LogFilters): Promise<LogsResult> {
    const params: Record<string, string> = {};
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.action) params.action = filters.action;
    if (filters.actorId) params.actorId = filters.actorId;
    if (filters.search) params.search = filters.search;
    if (filters.page) params.page = String(filters.page);
    if (filters.pageSize) params.pageSize = String(filters.pageSize);
    const { data } = await api.get<LogsResult>('/logs', { params });
    return data;
  },
};
