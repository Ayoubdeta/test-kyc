import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { statsApi } from '../api/stats.api';
import { useAuth } from '../hooks/useAuth';
import { canApprove, STATUS_HEX } from '../lib/roles';
import { BarChart, DonutChart, KpiCard, TrendBars } from './charts/Charts';

export const OVERVIEW_KEY = ['stats', 'overview'] as const;

// Resumen de KPIs para el panel de personal interno (compliance/admin/dirección).
export function StaffKpiOverview() {
  const { me } = useAuth();
  const isDireccion = canApprove(me?.user.role);

  const { data, isLoading } = useQuery({
    queryKey: OVERVIEW_KEY,
    queryFn: statsApi.overview,
  });

  if (isLoading || !data) {
    return (
      <div className="animate-fade-in rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-card">
        Cargando indicadores…
      </div>
    );
  }

  const t = data.totals;

  // Destinos de las tarjetas accionables (según rol).
  const porRevisarTo = isDireccion ? '/review' : '/pending-review';
  const enRevisionTo = isDireccion ? '/review' : '/in-review';
  const approvalTo = isDireccion ? '/approvals' : '/review';

  const kpis = [
    { label: `Enviados en ${data.year}`, value: t.enviadosEsteAno, accent: 'text-brand-600', icon: '📤', to: '/kpis' },
    { label: 'Por revisar', value: t.pendientes, accent: 'text-slate-600', icon: '🕒', to: porRevisarTo },
    { label: 'En revisión', value: t.enRevision, accent: 'text-blue-600', icon: '🔎', to: enRevisionTo },
    { label: 'Pendiente de aprobación', value: t.pendienteAprobacion, accent: 'text-indigo-600', icon: '📥', to: approvalTo },
    { label: 'Aprobados', value: t.aprobados, accent: 'text-green-600', icon: '✅', to: '/kpis' },
    { label: 'Caducados', value: t.caducados, accent: 'text-amber-600', icon: '⏰', to: '/kpis' },
  ];

  const donut = [
    { label: 'Pendientes', value: t.pendientes, color: STATUS_HEX.pendiente },
    { label: 'En revisión', value: t.enRevision, color: STATUS_HEX.en_revision },
    { label: 'Pendiente de aprobación', value: t.pendienteAprobacion, color: STATUS_HEX.pendiente_aprobacion },
    { label: 'Aprobados', value: t.aprobados, color: STATUS_HEX.aprobado },
    { label: 'Rechazados', value: t.rechazados, color: STATUS_HEX.rechazado },
    { label: 'Caducados', value: t.caducados, color: STATUS_HEX.caducado },
  ];

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Indicadores</h2>
        <Link to="/kpis" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          Ver KPIs completos →
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            accent={k.accent}
            icon={k.icon}
            to={k.to}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Distribución por estado</h3>
          <DonutChart segments={donut} />
        </div>
        <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Documentos enviados por mes ({data.year})
          </h3>
          {/* En pantallas anchas: barras verticales por mes. */}
          <div className="hidden sm:block">
            <TrendBars items={data.monthly.map((m) => ({ label: m.label, value: m.uploaded }))} />
          </div>
          {/* En móvil: solo los meses con actividad, en barras horizontales. */}
          <div className="sm:hidden">
            <BarChart
              items={data.monthly
                .filter((m) => m.uploaded > 0)
                .map((m) => ({ label: m.label, value: m.uploaded }))}
              emptyText="Sin documentos este año."
            />
          </div>
        </div>
      </div>
    </section>
  );
}
