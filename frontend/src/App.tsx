import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicOnlyRoute } from './components/PublicOnlyRoute';
import { RoleRoute } from './components/RoleRoute';
import { ActivatePage } from './pages/ActivatePage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { ChatPage } from './pages/ChatPage';
import { ClientDocumentsPage } from './pages/ClientDocumentsPage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { InReviewDocumentsPage } from './pages/InReviewDocumentsPage';
import { KpisPage } from './pages/KpisPage';
import { LoginPage } from './pages/LoginPage';
import { LogsPage } from './pages/LogsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PendingApprovalPage } from './pages/PendingApprovalPage';
import { PendingReviewDocumentsPage } from './pages/PendingReviewDocumentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ReviewDocumentsPage } from './pages/ReviewDocumentsPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
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
  );
}
