import type { ReportFilters, ReportResult } from '../types';
import { api } from './client';

export const reportsApi = {
  /** Informe detallado de documentos (personal interno), filtrable. */
  async documents(filters: ReportFilters): Promise<ReportResult> {
    const params: Record<string, string> = {};
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.docType) params.docType = filters.docType;
    if (filters.status) params.status = filters.status;
    if (filters.clientId) params.clientId = filters.clientId;
    if (filters.search) params.search = filters.search;
    const { data } = await api.get<ReportResult>('/reports/documents', { params });
    return data;
  },
};
