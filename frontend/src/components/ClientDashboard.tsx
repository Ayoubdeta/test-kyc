import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { documentsApi } from '../api/documents.api';
import { useI18n } from '../i18n';
import { useCountUp } from '../hooks/useCountUp';
import { DOCUMENT_TYPES } from '../lib/documents';
import { displayValue, formatDate } from '../lib/format';
import type { DocumentItem, MeResponse } from '../types';
import { Avatar } from './Avatar';
import { ClientDocumentsSummary } from './ClientDocumentsSummary';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  FileTextIcon,
  HistoryIcon,
  IdCardIcon,
  InboxIcon,
  SearchIcon,
  UserIcon,
} from './icons';

const DOCS_KEY = ['documents', 'mine'] as const;
const TOTAL = DOCUMENT_TYPES.length;

// Anillo de progreso circular animado (documentos aprobados / total).
function ProgressRing({ pct, approved }: { pct: number; approved: number }) {
  const { t } = useI18n();
  const size = 128;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [offset, setOffset] = useState(c);
  const shownPct = useCountUp(Math.round(pct * 100));

  useEffect(() => {
    const id = setTimeout(() => setOffset(c * (1 - pct)), 150);
    return () => clearTimeout(id);
  }, [pct, c]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="white"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-2xl font-bold leading-none">{shownPct}%</span>
        <span className="mt-1 text-[11px] font-medium text-white/80">
          {t('dashboard.approvedOf', { approved, total: TOTAL })}
        </span>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  accent: string; // clase de color del icono/valor
  ring: string; // clase del fondo del icono
  to: string;
  delay: number;
}

// Tarjeta de métrica con contador animado y elevación al pasar el ratón.
function StatCard({ label, value, icon, accent, ring, to, delay }: StatCardProps) {
  const shown = useCountUp(value);
  return (
    <Link
      to={to}
      style={{ animationDelay: `${delay}ms` }}
      className="group animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-elevated"
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition group-hover:scale-110 ${ring} ${accent}`}
        >
          {icon}
        </span>
        <span className={`text-3xl font-bold tabular-nums ${accent}`}>{shown}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-600">{label}</p>
    </Link>
  );
}

// Acceso rápido moderno con icono en degradado.
function ActionCard({
  to,
  title,
  description,
  icon,
  gradient,
}: {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
  gradient: string;
}) {
  return (
    <Link
      to={to}
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-elevated"
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm transition group-hover:scale-110 ${gradient}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
      <span
        className="ml-auto text-brand-500 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
        aria-hidden="true"
      >
        →
      </span>
    </Link>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="truncate text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

export function ClientDashboard({ me }: { me: MeResponse }) {
  const { t } = useI18n();
  const { user, profile } = me;
  const displayName = profile.fullName ?? user.username;

  const { data: documents = [] } = useQuery({
    queryKey: DOCS_KEY,
    queryFn: documentsApi.listMine,
  });

  const count = (status: DocumentItem['status']) =>
    documents.filter((d) => d.status === status).length;
  const approved = count('aprobado');
  const inReview = count('en_revision');
  const pendingApproval = count('pendiente_aprobacion');
  const rejected = count('rechazado');
  const pct = TOTAL > 0 ? approved / TOTAL : 0;

  // Mensaje contextual según la situación del cliente.
  const message =
    approved === TOTAL
      ? t('dashboard.msgAllApproved')
      : rejected > 0
        ? t('dashboard.msgRejected')
        : inReview + pendingApproval > 0
          ? t('dashboard.msgInReview')
          : t('dashboard.msgComplete');

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Hero con gradiente animado ─── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 bg-[length:200%_200%] p-6 text-white shadow-elevated animate-gradient-pan sm:p-8">
        {/* Barrido de brillo */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -inset-y-10 left-0 w-1/3 bg-white/10 blur-xl animate-shine" />
        </div>
        {/* Círculos decorativos flotantes */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 animate-float" />
        <div
          className="pointer-events-none absolute -bottom-16 right-24 h-32 w-32 rounded-full bg-white/5 animate-float"
          style={{ animationDelay: '1.5s' }}
        />

        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-full ring-4 ring-white/20">
              <Avatar src={profile.avatarUrl} name={displayName} size="md" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/70">{t('dashboard.welcome')}</p>
              <h1 className="text-2xl font-bold tracking-tight">
                {displayValue(profile.fullName ?? user.username)}
              </h1>
              <p className="mt-1 max-w-md text-sm text-white/80">{message}</p>
            </div>
          </div>
          <ProgressRing pct={pct} approved={approved} />
        </div>
      </section>

      {/* ─── Métricas con contador animado ─── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('dashboard.statApproved')}
          value={approved}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          accent="text-green-600"
          ring="bg-green-50"
          to="/history?estado=aprobado"
          delay={0}
        />
        <StatCard
          label={t('dashboard.statInReview')}
          value={inReview}
          icon={<SearchIcon className="h-5 w-5" />}
          accent="text-blue-600"
          ring="bg-blue-50"
          to="/history?estado=revisado"
          delay={70}
        />
        <StatCard
          label={t('dashboard.statPendingApproval')}
          value={pendingApproval}
          icon={<InboxIcon className="h-5 w-5" />}
          accent="text-indigo-600"
          ring="bg-indigo-50"
          to="/history?estado=revisado"
          delay={140}
        />
        <StatCard
          label={t('dashboard.statRejected')}
          value={rejected}
          icon={<AlertTriangleIcon className="h-5 w-5" />}
          accent="text-red-600"
          ring="bg-red-50"
          to="/history?estado=rechazado"
          delay={210}
        />
      </div>

      {/* ─── Accesos rápidos ─── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ActionCard
          to="/documents"
          title={t('dashboard.actionDocsTitle')}
          description={t('dashboard.actionDocsDesc')}
          icon={<FileTextIcon className="h-6 w-6" />}
          gradient="from-brand-500 to-brand-700"
        />
        <ActionCard
          to="/history"
          title={t('dashboard.actionHistoryTitle')}
          description={t('dashboard.actionHistoryDesc')}
          icon={<HistoryIcon className="h-6 w-6" />}
          gradient="from-slate-600 to-slate-800"
        />
      </div>

      {/* ─── Línea de tiempo de documentos ─── */}
      <ClientDocumentsSummary />

      {/* ─── Cuenta y perfil ─── */}
      <div className="grid gap-4 md:grid-cols-2">
        <section
          className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
          style={{ animationDelay: '80ms' }}
        >
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-800">
            <UserIcon className="h-5 w-5 text-slate-400" /> {t('dashboard.accountTitle')}
          </h2>
          <dl>
            <InfoRow label={t('dashboard.username')} value={user.username} />
            <InfoRow label={t('dashboard.email')} value={user.email} />
            <InfoRow label={t('dashboard.memberSince')} value={formatDate(user.createdAt)} />
          </dl>
        </section>
        <section
          className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
          style={{ animationDelay: '160ms' }}
        >
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-800">
            <IdCardIcon className="h-5 w-5 text-slate-400" /> {t('dashboard.profileTitle')}
          </h2>
          <dl>
            <InfoRow label={t('dashboard.fullName')} value={displayValue(profile.fullName)} />
            <InfoRow label={t('dashboard.phone')} value={displayValue(profile.phone)} />
            <InfoRow label={t('dashboard.address')} value={displayValue(profile.address)} />
          </dl>
          <Link
            to="/settings"
            className="mt-3 inline-flex text-sm font-medium text-brand-600 transition hover:text-brand-700"
          >
            {t('dashboard.editProfile')}
          </Link>
        </section>
      </div>
    </div>
  );
}
