import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { ClientDashboard } from '../components/ClientDashboard';
import { StaffKpiOverview } from '../components/StaffKpiOverview';
import { displayValue, formatDate, formatDateTime } from '../lib/format';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { canApprove, isStaff } from '../lib/roles';

// Tarjeta de acceso rápido a una sección.
function QuickLink({ to, title, description }: { to: string; title: string; description: string }) {
  return (
    <Link
      to={to}
      className="group animate-fade-in-up rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-card transition duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-elevated"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <span className="text-brand-500 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true">
          →
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </Link>
  );
}

// Fila de dato clave/valor reutilizable.
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 dark:border-slate-800 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-900 dark:text-slate-50 sm:text-end">{value}</dd>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="animate-fade-in-up rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-card">
      <h2 className="mb-2 text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
      <dl>{children}</dl>
    </section>
  );
}

export function DashboardPage() {
  const { me } = useAuth();
  const { t } = useI18n();

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
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              {t('staffDash.hello', { name: displayValue(profile.fullName ?? user.username) })}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('staffDash.subtitle')}</p>
          </div>
        </div>
        <Link
          to="/settings"
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {t('nav.settings')}
        </Link>
      </div>

      {/* KPIs para personal interno */}
      {isStaff(user.role) && <StaffKpiOverview />}

      {/* Accesos rápidos según el rol */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isStaff(user.role) && (
          <QuickLink
            to="/review"
            title={t('staffDash.qlDocsTitle')}
            description={
              canApprove(user.role)
                ? t('staffDash.qlDocsDescApprove')
                : t('staffDash.qlDocsDescReview')
            }
          />
        )}
        {canApprove(user.role) && (
          <QuickLink
            to="/approvals"
            title={t('staffDash.qlApprovalsTitle')}
            description={t('staffDash.qlApprovalsDesc')}
          />
        )}
        {isStaff(user.role) && (
          <QuickLink
            to="/kpis"
            title={t('staffDash.qlKpisTitle')}
            description={t('staffDash.qlKpisDesc')}
          />
        )}
        {user.role === 'admin' && (
          <QuickLink
            to="/users"
            title={t('staffDash.qlUsersTitle')}
            description={t('staffDash.qlUsersDesc')}
          />
        )}
        <QuickLink
          to="/settings"
          title={t('staffDash.qlSettingsTitle')}
          description={t('staffDash.qlSettingsDesc')}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <InfoCard title={t('staffDash.accountTitle')}>
          <InfoRow label={t('dashboard.username')} value={user.username} />
          <InfoRow label={t('dashboard.email')} value={user.email} />
          <InfoRow label={t('dashboard.memberSince')} value={formatDate(user.createdAt)} />
          <InfoRow label={t('staffDash.lastAccess')} value={formatDateTime(user.lastLoginAt)} />
        </InfoCard>

        <InfoCard title={t('staffDash.profileTitle')}>
          <InfoRow label={t('dashboard.fullName')} value={displayValue(profile.fullName)} />
          <InfoRow label={t('dashboard.phone')} value={displayValue(profile.phone)} />
          <InfoRow label={t('dashboard.address')} value={displayValue(profile.address)} />
          <InfoRow label={t('staffDash.birthDate')} value={formatDate(profile.birthDate)} />
        </InfoCard>
      </div>

      {profile.bio && (
        <div className="mt-5">
          <InfoCard title={t('staffDash.bioTitle')}>
            <p className="py-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{profile.bio}</p>
          </InfoCard>
        </div>
      )}
    </DashboardLayout>
  );
}
