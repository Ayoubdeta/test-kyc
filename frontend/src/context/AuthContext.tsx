import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { createContext, useCallback, useMemo, type ReactNode } from 'react';
import {
  authApi,
  type ActivatePayload,
  type LoginPayload,
  type RegisterPayload,
} from '../api/auth.api';
import { userApi } from '../api/user.api';
import type { MeResponse } from '../types';

// Clave de React Query para el estado de sesión. React Query es la única
// fuente de verdad del "server state"; el contexto solo lo envuelve con
// acciones (login / register / logout).
const ME_QUERY_KEY = ['auth', 'me'] as const;

export interface AuthContextValue {
  me: MeResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  activate: (payload: ActivatePayload) => Promise<void>;
  logout: () => Promise<void>;
  refetchMe: () => Promise<unknown>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery<MeResponse | null>({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      try {
        return await userApi.getMe();
      } catch (error) {
        // 401 = no hay sesión: es un estado válido, no un error a propagar.
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
  });

  const login = useCallback(
    async (payload: LoginPayload) => {
      await authApi.login(payload);
      // Tras autenticar, recargamos los datos de sesión.
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
    [queryClient],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      await authApi.register(payload);
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
    [queryClient],
  );

  const activate = useCallback(
    async (payload: ActivatePayload) => {
      await authApi.activate(payload);
      await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    // Limpiamos el estado local inmediatamente.
    queryClient.setQueryData(ME_QUERY_KEY, null);
    await queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      me: meQuery.data ?? null,
      isLoading: meQuery.isLoading,
      isAuthenticated: Boolean(meQuery.data),
      login,
      register,
      activate,
      logout,
      refetchMe: () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
    }),
    [meQuery.data, meQuery.isLoading, login, register, activate, logout, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
