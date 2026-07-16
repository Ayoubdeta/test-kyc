import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { statsApi } from '../api/stats.api';
import { BarChart, DonutChart, KpiCard, TrendBars } from '../components/charts/Charts';
import { Button } from '../components/ui/Button';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { DOCUMENT_TYPES } from '../lib/documents';
import { STATUS_HEX, STATUS_LABELS } from '../lib/roles';
import type { DocumentStatus, DocumentTypeKey, StatsFilters } from '../types';

const STATUS_ORDER: DocumentStatus[] = [
  'pendiente',
  'en_revision',
  'pendiente_aprobacion',
  'aprobado',
  'rechazado',
  'caducado',
];

// 'YYYY-MM' → 'MM/AA'
function shortMonth(m: string): string {
  const [y, mm] = m.split('-');
  return `${mm}/${y.slice(2)}`;
}

const EMPTY_FILTERS: StatsFilters = {};

export function KpisPage() {
  // Estado del formulario (borrador) y filtros aplicados (los que consultan).
  const [draft, setDraft] = useState<StatsFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<StatsFilters>(EMPTY_FILTERS);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['stats', 'filtered', applied],
    queryFn: () => statsApi.filtered(applied),
  });

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of data?.byStatus ?? []) map[s.status] = s.count;
    return map;
  }, [data]);

  const hasFilters = Boolean(applied.from || applied.to || applied.docType || applied.status);

  const apply = () => setApplied(draft);
  const reset = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  };

  const donut = STATUS_ORDER.map((s) => ({
    label: STATUS_LABELS[s],
    value: statusCounts[s] ?? 0,
    color: STATUS_HEX[s],
  }));

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">KPIs de documentos</h1>
        <p className="text-sm text-slate-500">
          Analiza los documentos con filtros por fecha, tipo y estado.
        </p>
      </div>

      {/* Barra de filtros */}
      <div className="mb-6 animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Desde</span>
            <input
              type="date"
              value={draft.from ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value || undefined }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Hasta</span>
            <input
              type="date"
              value={draft.to ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value || undefined }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Tipo</span>
            <select
              value={draft.docType ?? ''}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  docType: (e.target.value || undefined) as DocumentTypeKey | undefined,
                }))
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todos</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Estado</span>
            <select
              value={draft.status ?? ''}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  status: (e.target.value || undefined) as DocumentStatus | undefined,
                }))
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todos</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button onClick={apply} isLoading={isFetching}>
              Aplicar
            </Button>
            {hasFilters && (
              <Button variant="ghost" onClick={reset}>
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Tarjetas KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            <KpiCard label="Total" value={data.total} accent="text-slate-800" />
            <KpiCard label="Pendientes" value={statusCounts.pendiente ?? 0} accent="text-slate-600" />
            <KpiCard label="En revisión" value={statusCounts.en_revision ?? 0} accent="text-blue-600" />
            <KpiCard
              label="Pendiente de aprobación"
              value={statusCounts.pendiente_aprobacion ?? 0}
              accent="text-indigo-600"
            />
            <KpiCard label="Aprobados" value={statusCounts.aprobado ?? 0} accent="text-green-600" />
            <KpiCard label="Rechazados" value={statusCounts.rechazado ?? 0} accent="text-red-600" />
            <KpiCard label="Caducados" value={statusCounts.caducado ?? 0} accent="text-amber-600" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Por estado</h3>
              <DonutChart segments={donut} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Por tipo de documento</h3>
              <BarChart
                items={data.byType.map((t) => ({ label: t.label, value: t.count }))}
                emptyText="Sin documentos para estos filtros."
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Documentos enviados por mes</h3>
            <TrendBars
              items={data.byMonth.map((m) => ({ label: shortMonth(m.month), value: m.uploaded }))}
            />
          </div>

          {/* Tabla por usuario */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="border-b border-slate-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-slate-700">Por usuario</h3>
            </div>
            {data.byUser.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">Sin datos para estos filtros.</p>
            ) : (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Pend.</th>
                    <th className="px-4 py-3 text-right">En rev.</th>
                    <th className="px-4 py-3 text-right">P. aprob.</th>
                    <th className="px-4 py-3 text-right">Aprob.</th>
                    <th className="px-4 py-3 text-right">Rech.</th>
                    <th className="px-4 py-3 text-right">Cad.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.byUser.map((u) => (
                    <tr key={u.userId} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{u.total}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{u.pendiente}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{u.en_revision}</td>
                      <td className="px-4 py-3 text-right text-indigo-600">{u.pendiente_aprobacion}</td>
                      <td className="px-4 py-3 text-right text-green-600">{u.aprobado}</td>
                      <td className="px-4 py-3 text-right text-red-600">{u.rechazado}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{u.caducado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
