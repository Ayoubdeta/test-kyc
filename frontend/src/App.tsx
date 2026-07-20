import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PageSpinner } from './components/PageSpinner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicOnlyRoute } from './components/PublicOnlyRoute';
import { RoleRoute } from './components/RoleRoute';

// Carga diferida (code splitting) de las páginas: cada ruta se descarga solo
// cuando se visita, en vez de meter las 17 páginas en el bundle inicial. Así el
// primer acceso (login) es más ligero. Los guardas de ruta van estáticos porque
// se evalúan siempre y son pequeños.
const ActivatePage = lazy(() => import('./pages/ActivatePage').then((m) => ({ default: m.ActivatePage })));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const ChatPage = lazy(() => import('./pages/ChatPage').then((m) => ({ default: m.ChatPage })));
const ClientDocumentsPage = lazy(() => import('./pages/ClientDocumentsPage').then((m) => ({ default: m.ClientDocumentsPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const InReviewDocumentsPage = lazy(() => import('./pages/InReviewDocumentsPage').then((m) => ({ default: m.InReviewDocumentsPage })));
const KpisPage = lazy(() => import('./pages/KpisPage').then((m) => ({ default: m.KpisPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const LogsPage = lazy(() => import('./pages/LogsPage').then((m) => ({ default: m.LogsPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const PendingApprovalPage = lazy(() => import('./pages/PendingApprovalPage').then((m) => ({ default: m.PendingApprovalPage })));
const PendingReviewDocumentsPage = lazy(() => import('./pages/PendingReviewDocumentsPage').then((m) => ({ default: m.PendingReviewDocumentsPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const ReviewDocumentsPage = lazy(() => import('./pages/ReviewDocumentsPage').then((m) => ({ default: m.ReviewDocumentsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

export function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* Rutas solo para usuarios NO autenticados */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          {/* Activación de cuenta del cliente (enlace de invitación) */}
          <Route path="/activate" element={<ActivatePage />} />
        </Route>

        {/* Rutas privadas (requieren sesión) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Solo clientes: subir/ver sus documentos e historial */}
          <Route element={<RoleRoute allow={['cliente']} />}>
            <Route path="/documents" element={<ClientDocumentsPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Route>

          {/* Personal interno: ver documentos por usuario, KPIs e informes */}
          <Route element={<RoleRoute allow={['admin', 'compliance', 'direccion']} />}>
            <Route path="/review" element={<ReviewDocumentsPage />} />
            <Route path="/kpis" element={<KpisPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          {/* Admin/Compliance: por revisar, en revisión y chat con clientes */}
          <Route element={<RoleRoute allow={['admin', 'compliance']} />}>
            <Route path="/pending-review" element={<PendingReviewDocumentsPage />} />
            <Route path="/in-review" element={<InReviewDocumentsPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Route>

          {/* Solo Dirección General: aprobar/rechazar documentos en revisión */}
          <Route element={<RoleRoute allow={['direccion']} />}>
            <Route path="/approvals" element={<PendingApprovalPage />} />
          </Route>

          {/* Solo admin: gestión de usuarios y registro de actividad */}
          <Route element={<RoleRoute allow={['admin']} />}>
            <Route path="/users" element={<AdminUsersPage />} />
            <Route path="/logs" element={<LogsPage />} />
          </Route>
        </Route>

        {/* Por defecto, al dashboard (que redirige a login si no hay sesión) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
