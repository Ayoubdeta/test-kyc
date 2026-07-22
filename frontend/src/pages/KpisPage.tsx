import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { statsApi } from '../api/stats.api';
import { BarChart, DonutChart, KpiCard, TrendBars } from '../components/charts/Charts';
import { QueryError } from '../components/QueryError';
import { Button } from '../components/ui/Button';
import { useI18n } from '../i18n';
import { docTypeLabel, statusLabel } from '../i18n/labels';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { DOCUMENT_TYPES } from '../lib/documents';
import { STATUS_HEX, STATUS_ORDER } from '../lib/roles';
import type { DocumentStatus, DocumentTypeKey, StatsFilters } from '../types';

// 'YYYY-MM' → 'MM/AA'
function shortMonth(m: string): string {
  const [y, mm] = m.split('-');
  return `${mm}/${y.slice(2)}`;
}

const EMPTY_FILTERS: StatsFilters = {};

export function KpisPage() {
  const { t } = useI18n();
  // Estado del formulario (borrador) y filtros aplicados (los que consultan).
  const [draft, setDraft] = useState<StatsFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<StatsFilters>(EMPTY_FILTERS);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
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
    label: statusLabel(t, s),
    value: statusCounts[s] ?? 0,
    color: STATUS_HEX[s],
  }));

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">{t('kpi.pageTitle')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('staffDash.qlKpisDesc')}</p>
      </div>

      {/* Barra de filtros */}
      <div className="mb-6 animate-fade-in-up rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('kpi.from')}</span>
            <input
              type="date"
              value={draft.from ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value || undefined }))}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('kpi.to')}</span>
            <input
              type="date"
              value={draft.to ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value || undefined }))}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('kpi.type')}</span>
            <select
              value={draft.docType ?? ''}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  docType: (e.target.value || undefined) as DocumentTypeKey | undefined,
                }))
              }
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">{t('kpi.all')}</option>
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt.key} value={dt.key}>
                  {docTypeLabel(t, dt.key)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('kpi.statusLabel')}</span>
            <select
              value={draft.status ?? ''}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  status: (e.target.value || undefined) as DocumentStatus | undefined,
                }))
              }
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">{t('kpi.all')}</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(t, s)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button onClick={apply} isLoading={isFetching}>
              {t('kpi.apply')}
            </Button>
            {hasFilters && (
              <Button variant="ghost" onClick={reset}>
                {t('kpi.clear')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {isError ? (
        <QueryError onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Tarjetas KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            <KpiCard label={t('kpi.total')} value={data.total} accent="text-slate-800 dark:text-slate-100" />
            <KpiCard label={t('kpi.pending')} value={statusCounts.pendiente ?? 0} accent="text-slate-600 dark:text-slate-300" />
            <KpiCard label={t('kpi.inReview')} value={statusCounts.en_revision ?? 0} accent="text-blue-600 dark:text-blue-400" />
            <KpiCard
              label={t('kpi.pendingApproval')}
              value={statusCounts.pendiente_aprobacion ?? 0}
              accent="text-indigo-600 dark:text-indigo-400"
            />
            <KpiCard label={t('kpi.approved')} value={statusCounts.aprobado ?? 0} accent="text-green-600 dark:text-green-400" />
            <KpiCard label={t('kpi.rejected')} value={statusCounts.rechazado ?? 0} accent="text-red-600 dark:text-red-400" />
            <KpiCard label={t('kpi.expired')} value={statusCounts.caducado ?? 0} accent="text-amber-600 dark:text-amber-400" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('kpi.byStatusShort')}</h3>
              <DonutChart segments={donut} />
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-card">
              <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('kpi.byType')}</h3>
              <BarChart
                items={data.byType.map((bt) => ({ label: docTypeLabel(t, bt.docType), value: bt.count }))}
                emptyText={t('kpi.noneForFilters')}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-card">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('kpi.byMonthPlain')}</h3>
            <TrendBars
              items={data.byMonth.map((m) => ({ label: shortMonth(m.month), value: m.uploaded }))}
            />
          </div>

          {/* Tabla por usuario */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-card">
            <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('kpi.byUser')}</h3>
            </div>
            {data.byUser.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 dark:text-slate-400">{t('kpi.noDataForFilters')}</p>
            ) : (
              <table className="w-full min-w-[720px] text-start text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">{t('kpi.thUser')}</th>
                    <th className="px-4 py-3 text-end">{t('kpi.thTotal')}</th>
                    <th className="px-4 py-3 text-end">{t('kpi.thPending')}</th>
                    <th className="px-4 py-3 text-end">{t('kpi.thInReview')}</th>
                    <th className="px-4 py-3 text-end">{t('kpi.thPendingApproval')}</th>
                    <th className="px-4 py-3 text-end">{t('kpi.thApproved')}</th>
                    <th className="px-4 py-3 text-end">{t('kpi.thRejected')}</th>
                    <th className="px-4 py-3 text-end">{t('kpi.thExpired')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.byUser.map((u) => (
                    <tr key={u.userId} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{u.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-end font-semibold text-slate-800 dark:text-slate-100">{u.total}</td>
                      <td className="px-4 py-3 text-end text-slate-600 dark:text-slate-300">{u.pendiente}</td>
                      <td className="px-4 py-3 text-end text-blue-600 dark:text-blue-400">{u.en_revision}</td>
                      <td className="px-4 py-3 text-end text-indigo-600 dark:text-indigo-400">{u.pendiente_aprobacion}</td>
                      <td className="px-4 py-3 text-end text-green-600 dark:text-green-400">{u.aprobado}</td>
                      <td className="px-4 py-3 text-end text-red-600 dark:text-red-400">{u.rechazado}</td>
                      <td className="px-4 py-3 text-end text-amber-600 dark:text-amber-400">{u.caducado}</td>
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
