import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { ClientDashboard } from '../components/ClientDashboard';
import { StaffKpiOverview } from '../components/StaffKpiOverview';
import { displayValue, formatDate, formatDateTime } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { canApprove, isStaff } from '../lib/roles';

// Tarjeta de acceso rápido a una sección.
function QuickLink({ to, title, description }: { to: string; title: string; description: string }) {
  return (
    <Link
      to={to}
      className="group animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-elevated"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <span className="text-brand-500 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true">
          →
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </Link>
  );
}

// Fila de dato clave/valor reutilizable.
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900 sm:text-right">{value}</dd>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <h2 className="mb-2 text-base font-semibold text-slate-800">{title}</h2>
      <dl>{children}</dl>
    </section>
  );
}

export function DashboardPage() {
  const { me } = useAuth();

  // ProtectedRoute garantiza que hay sesión; esta guarda es por seguridad de tipos.
  if (!me) {
    return null;
  }

  const { user, profile } = me;
  const displayName = profile.fullName ?? user.username;

  // Los clientes tienen un panel propio, moderno y con animaciones.
  if (user.role === 'cliente') {
    return (
      <DashboardLayout>
        <ClientDashboard me={me} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Saludo / cabecera */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar src={profile.avatarUrl} name={displayName} size="md" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Hola, {displayValue(profile.fullName ?? user.username)}
            </h1>
            <p className="text-sm text-slate-500">
              Este es tu panel. Aquí tienes la información de tu cuenta.
            </p>
          </div>
        </div>
        <Link
          to="/settings"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Configurar cuenta
        </Link>
      </div>

      {/* KPIs para personal interno */}
      {isStaff(user.role) && <StaffKpiOverview />}

      {/* Accesos rápidos según el rol */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isStaff(user.role) && (
          <QuickLink
            to="/review"
            title="Documentos por usuario"
            description={
              canApprove(user.role)
                ? 'Consulta los documentos de cada cliente y decide sobre los que están en revisión.'
                : 'Consulta los documentos de cada cliente y envíalos a Dirección.'
            }
          />
        )}
        {canApprove(user.role) && (
          <QuickLink
            to="/approvals"
            title="Pendientes de aprobar"
            description="Documentos revisados que esperan tu aprobación."
          />
        )}
        {isStaff(user.role) && (
          <QuickLink
            to="/kpis"
            title="KPIs"
            description="Analiza los documentos con filtros por fecha, tipo y estado."
          />
        )}
        {user.role === 'admin' && (
          <QuickLink
            to="/users"
            title="Usuarios"
            description="Gestiona los roles de los usuarios."
          />
        )}
        <QuickLink
          to="/settings"
          title="Configurar cuenta"
          description="Actualiza tu foto y tus datos personales."
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title="Cuenta">
          <InfoRow label="Usuario" value={user.username} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Miembro desde" value={formatDate(user.createdAt)} />
          <InfoRow label="Último acceso" value={formatDateTime(user.lastLoginAt)} />
        </InfoCard>

        <InfoCard title="Perfil">
          <InfoRow label="Nombre completo" value={displayValue(profile.fullName)} />
          <InfoRow label="Teléfono" value={displayValue(profile.phone)} />
          <InfoRow label="Dirección" value={displayValue(profile.address)} />
          <InfoRow label="Fecha de nacimiento" value={formatDate(profile.birthDate)} />
        </InfoCard>
      </div>

      {profile.bio && (
        <div className="mt-5">
          <InfoCard title="Biografía">
            <p className="py-1 text-sm leading-relaxed text-slate-700">{profile.bio}</p>
          </InfoCard>
        </div>
      )}
    </DashboardLayout>
  );
}
