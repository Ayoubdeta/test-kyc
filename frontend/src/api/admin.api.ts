import type { DocumentEventItem, DocumentItem, MeResponse, PublicUser, Role } from '../types';
import { api } from './client';

export interface AdminUpdateUserPayload {
  username: string;
  email: string;
  role: Role;
  fullName: string;
  phone: string;
  address: string;
  birthDate: string;
  bio?: string;
}

export type ClientType = 'empresa' | 'autonomo' | 'particular';

export interface CreateClientPayload {
  razonSocial: string;
  cif: string;
  clientType: ClientType;
  comercialAsignado?: string;
  email: string;
}

export interface CreateClientResult {
  user: PublicUser;
  activationToken: string;
}

// Roles de personal interno que el admin puede dar de alta (nunca 'cliente').
export type StaffRole = 'admin' | 'compliance' | 'direccion';

export interface CreateStaffPayload {
  fullName: string;
  email: string;
  role: StaffRole;
}

export const adminApi = {
  /** Alta de un cliente (devuelve el token para componer el enlace de activación). */
  async createClient(payload: CreateClientPayload): Promise<CreateClientResult> {
    const { data } = await api.post<CreateClientResult>('/users/clients', payload);
    return data;
  },

  /** Alta de un usuario interno (devuelve el token para el enlace de activación). */
  async createStaff(payload: CreateStaffPayload): Promise<CreateClientResult> {
    const { data } = await api.post<CreateClientResult>('/users/staff', payload);
    return data;
  },

  /** Lista de usuarios (solo admin). */
  async listUsers(): Promise<PublicUser[]> {
    const { data } = await api.get<{ users: PublicUser[] }>('/users');
    return data.users;
  },

  /** Datos completos (usuario + perfil) de un usuario. */
  async getUser(userId: string): Promise<MeResponse> {
    const { data } = await api.get<MeResponse>(`/users/${userId}`);
    return data;
  },

  /** Edición completa (cuenta + perfil + rol). */
  async updateUser(userId: string, payload: AdminUpdateUserPayload): Promise<MeResponse> {
    const { data } = await api.patch<MeResponse>(`/users/${userId}`, payload);
    return data;
  },

  /** Restablece la contraseña de un usuario. */
  async resetPassword(userId: string, password: string): Promise<void> {
    await api.post(`/users/${userId}/reset-password`, { password });
  },

  /** Elimina un usuario. */
  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/users/${userId}`);
  },

  /** Documentos actuales de un usuario. */
  async getUserDocuments(userId: string): Promise<DocumentItem[]> {
    const { data } = await api.get<{ documents: DocumentItem[] }>(`/documents/user/${userId}`);
    return data.documents;
  },

  /** Historial de eventos de documentos de un usuario. */
  async getUserHistory(userId: string): Promise<DocumentEventItem[]> {
    const { data } = await api.get<{ events: DocumentEventItem[] }>(
      `/documents/user/${userId}/history`,
    );
    return data.events;
  },
};
