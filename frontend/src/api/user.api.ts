import type { MeResponse, PublicProfile } from '../types';
import { api } from './client';

export interface UpdateProfilePayload {
  fullName: string;
  phone: string;
  address: string;
  birthDate: string;
  bio?: string;
  // data URL de la imagen para fijar/cambiar la foto, o null para quitarla.
  avatarUrl?: string | null;
}

export const userApi = {
  /** Datos del usuario autenticado (usuario + perfil) para el dashboard. */
  async getMe(): Promise<MeResponse> {
    const { data } = await api.get<MeResponse>('/users/me');
    return data;
  },

  /** Actualiza el perfil del usuario autenticado. */
  async updateProfile(payload: UpdateProfilePayload): Promise<PublicProfile> {
    const { data } = await api.patch<{ profile: PublicProfile }>(
      '/users/me/profile',
      payload,
    );
    return data.profile;
  },
};
