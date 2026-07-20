import type { DocumentEventItem, DocumentItem, DocumentTypeKey } from '../types';
import { api } from './client';

export interface DecisionPayload {
  status: 'aprobado' | 'rechazado';
  comment?: string;
  validityMonths?: number;
}

export const documentsApi = {
  /** Sube un PDF de un tipo concreto (cliente). */
  async upload(docType: DocumentTypeKey, file: File): Promise<DocumentItem> {
    const form = new FormData();
    form.append('file', file);
    form.append('docType', docType);
    const { data } = await api.post<{ document: DocumentItem }>('/documents', form);
    return data.document;
  },

  /** Lista los documentos del propio cliente. */
  async listMine(): Promise<DocumentItem[]> {
    const { data } = await api.get<{ documents: DocumentItem[] }>('/documents/mine');
    return data.documents;
  },

  /** Historial de eventos de los documentos del propio cliente. */
  async history(): Promise<DocumentEventItem[]> {
    const { data } = await api.get<{ events: DocumentEventItem[] }>('/documents/history');
    return data.events;
  },

  /** Lista todos los documentos (admin/compliance). */
  async listAll(): Promise<DocumentItem[]> {
    const { data } = await api.get<{ documents: DocumentItem[] }>('/documents');
    return data.documents;
  },

  /** Descarga el PDF como blob (respeta el auto-refresh del cliente axios). */
  async download(id: string): Promise<Blob> {
    const { data } = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
    return data as Blob;
  },

  /** Compliance/Admin: abre un documento pendiente para revisarlo (→ en revisión). */
  async startReview(id: string): Promise<DocumentItem> {
    const { data } = await api.patch<{ document: DocumentItem }>(
      `/documents/${id}/start-review`,
    );
    return data.document;
  },

  /**
   * Compliance/Admin: tras revisar, envía a aprobación de Dirección proponiendo
   * la validez (meses). Dirección podrá ajustarla al aprobar.
   */
  async sendToApproval(
    id: string,
    validityMonths: number,
    comment?: string,
  ): Promise<DocumentItem> {
    const { data } = await api.patch<{ document: DocumentItem }>(
      `/documents/${id}/review`,
      { action: 'enviar_aprobacion', validityMonths, comment },
    );
    return data.document;
  },

  /** Compliance/Admin: cancela el documento en revisión (queda rechazado; el cliente reenvía). */
  async cancelReview(id: string, comment?: string): Promise<DocumentItem> {
    const { data } = await api.patch<{ document: DocumentItem }>(
      `/documents/${id}/review`,
      { action: 'cancelar', comment },
    );
    return data.document;
  },

  /** Dirección General: aprueba o rechaza (en revisión → aprobado/rechazado). */
  async decide(id: string, payload: DecisionPayload): Promise<DocumentItem> {
    const { data } = await api.patch<{ document: DocumentItem }>(
      `/documents/${id}/decision`,
      payload,
    );
    return data.document;
  },
};
