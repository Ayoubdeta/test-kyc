import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';
import { PageSpinner } from './PageSpinner';

// Protege rutas según el rol. Debe ir dentro de ProtectedRoute (ya garantiza
// sesión). Si el rol no está permitido, redirige al dashboard.
export function RoleRoute({ allow }: { allow: Role[] }) {
  const { me, isLoading } = useAuth();

  if (isLoading) {
    return <PageSpinner />;
  }

  if (!me || !allow.includes(me.user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
