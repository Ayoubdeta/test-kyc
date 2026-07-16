import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AppLogo, PoweredByDecal } from '../components/Brand';
import { ChatWidget } from '../components/ChatWidget';
import { NotificationBell } from '../components/NotificationBell';
import { UserMenu } from '../components/UserMenu';
import { useAuth } from '../hooks/useAuth';
import { canApprove, canReview, isStaff } from '../lib/roles';

// Estructura del área privada: cabecera con la navegación y el menú de usuario,
// y el contenido debajo.
export function DashboardLayout({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const location = useLocation();

  // Navegación adaptada al rol del usuario.
  const role = me?.user.role;
  const navItems: { to: string; label: string }[] = [
    { to: '/dashboard', label: 'Panel' },
    ...(role === 'cliente'
      ? [
          { to: '/documents', label: 'Mis documentos' },
          { to: '/history', label: 'Historial' },
        ]
      : []),
    ...(isStaff(role) ? [{ to: '/review', label: 'Documentos' }] : []),
    ...(canReview(role)
      ? [
          { to: '/pending-review', label: 'Por revisar' },
          { to: '/in-review', label: 'En revisión' },
        ]
      : []),
    ...(canApprove(role) ? [{ to: '/approvals', label: 'Pendientes de aprobar' }] : []),
    ...(canReview(role) ? [{ to: '/chat', label: 'Chat' }] : []),
    ...(isStaff(role) ? [{ to: '/kpis', label: 'KPIs' }] : []),
    ...(isStaff(role) ? [{ to: '/reports', label: 'Informes' }] : []),
    ...(role === 'admin' ? [{ to: '/users', label: 'Usuarios' }] : []),
    ...(role === 'admin' ? [{ to: '/logs', label: 'Logs' }] : []),
    { to: '/settings', label: 'Configurar cuenta' },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 bg-gradient-to-r from-brand-800 via-brand-600 to-brand-800 text-white shadow-elevated">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              {/* El logo KYC es negro: lo colocamos en una caja blanca para que
                  se vea sobre el rojo. */}
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
                <AppLogo className="h-6 w-6" />
              </div>
              <span className="text-lg font-semibold tracking-tight">KYC</span>
            </div>
            <nav className="hidden max-w-full items-center gap-1 overflow-x-auto text-sm md:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu />
          </div>
        </div>

        {/* Navegación en móvil */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-white/15 px-4 py-2 text-sm md:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition-colors ${
                  isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main key={location.pathname} className="mx-auto w-full max-w-5xl flex-1 animate-fade-in px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} KYC</span>
          <PoweredByDecal />
        </div>
      </footer>

      {/* Chat flotante para el cliente */}
      {role === 'cliente' && <ChatWidget />}
    </div>
  );
}
