import type { StatsFilters, StatsOverview, StatsResult } from '../types';
import { api } from './client';

export const statsApi = {
  /** KPIs de cabecera para el panel. */
  async overview(): Promise<StatsOverview> {
    const { data } = await api.get<StatsOverview>('/stats/overview');
    return data;
  },

  /** Estadísticas completas y filtrables para el panel de KPIs. */
  async filtered(filters: StatsFilters): Promise<StatsResult> {
    const params: Record<string, string> = {};
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.docType) params.docType = filters.docType;
    if (filters.status) params.status = filters.status;
    const { data } = await api.get<StatsResult>('/stats', { params });
    return data;
  },
};
