import type { AuthResponse } from '../types';
import { api } from './client';

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phone: string;
  address: string;
  birthDate: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface ActivatePayload {
  token: string;
  password: string;
  acceptPrivacy: boolean;
  acceptTerms: boolean;
}

export interface ActivationInfo {
  email: string;
  razonSocial: string;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  /** Datos del expediente asociado a un token de activación. */
  async activationInfo(token: string): Promise<ActivationInfo> {
    const { data } = await api.get<ActivationInfo>(`/auth/activate/${token}`);
    return data;
  },

  /** Activa la cuenta del cliente (fija contraseña + acepta políticas). */
  async activate(payload: ActivatePayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/activate', payload);
    return data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
};
