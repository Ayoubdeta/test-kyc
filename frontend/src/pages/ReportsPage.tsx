import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { reportsApi } from '../api/reports.api';
import { FileTextIcon, InboxIcon, SearchIcon } from '../components/icons';
import { QueryError } from '../components/QueryError';
import { Button } from '../components/ui/Button';
import { useI18n } from '../i18n';
import { docTypeLabel, statusLabel } from '../i18n/labels';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { exportCsv, type CsvColumn } from '../lib/csv';
import { DOCUMENT_TYPES } from '../lib/documents';
import { formatDate } from '../lib/format';
import { STATUS_BADGE_CLASSES, STATUS_ORDER } from '../lib/roles';
import type { DocumentStatus, DocumentTypeKey, ReportFilters, ReportRow } from '../types';

const EMPTY_FILTERS: ReportFilters = {};

export function ReportsPage() {
  const { t } = useI18n();
  const [draft, setDraft] = useState<ReportFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<ReportFilters>(EMPTY_FILTERS);

  // Columnas del CSV: una única fuente de verdad para la tabla y la exportación.
  const CSV_COLUMNS: CsvColumn<ReportRow>[] = [
    { header: t('rep.csvClient'), value: (r) => r.clientName },
    { header: t('rep.csvEmail'), value: (r) => r.clientEmail },
    { header: t('rep.csvDocument'), value: (r) => r.docLabel },
    { header: t('rep.csvFile'), value: (r) => r.originalName },
    { header: t('rep.csvStatus'), value: (r) => statusLabel(t, r.status) },
    { header: t('rep.csvSent'), value: (r) => formatDate(r.uploadedAt) },
    { header: t('rep.csvReviewedBy'), value: (r) => r.reviewerName ?? '' },
    { header: t('rep.csvReviewDate'), value: (r) => (r.reviewedAt ? formatDate(r.reviewedAt) : '') },
    { header: t('rep.csvDecidedBy'), value: (r) => r.deciderName ?? '' },
    { header: t('rep.csvDecisionDate'), value: (r) => (r.decidedAt ? formatDate(r.decidedAt) : '') },
    { header: t('rep.csvExpires'), value: (r) => (r.expiresAt ? formatDate(r.expiresAt) : '') },
    { header: t('rep.csvReason'), value: (r) => r.comment ?? '' },
  ];

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['reports', 'documents', applied],
    queryFn: () => reportsApi.documents(applied),
  });

  const hasFilters = Boolean(
    applied.from || applied.to || applied.docType || applied.status || applied.search,
  );

  const apply = () => setApplied(draft);
  const reset = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  };

  const handleExport = () => {
    if (!data || data.rows.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    exportCsv(`informe_documentos_${stamp}.csv`, CSV_COLUMNS, data.rows);
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('rep.title')}</h1>
          <p className="text-sm text-slate-500">{t('rep.subtitle')}</p>
        </div>
        <Button
          variant="ghost"
          onClick={handleExport}
          disabled={!data || data.rows.length === 0}
        >
          <FileTextIcon className="h-4 w-4" />
          {t('rep.exportCsv')}
        </Button>
      </div>

      {/* Barra de filtros modular */}
      <div className="mb-6 animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">{t('kpi.from')}</span>
            <input
              type="date"
              value={draft.from ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value || undefined }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">{t('kpi.to')}</span>
            <input
              type="date"
              value={draft.to ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value || undefined }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">{t('kpi.type')}</span>
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
              <option value="">{t('kpi.all')}</option>
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt.key} value={dt.key}>
                  {docTypeLabel(t, dt.key)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">{t('kpi.statusLabel')}</span>
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
              <option value="">{t('kpi.all')}</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(t, s)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">{t('rep.client')}</span>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('rep.searchPlaceholder')}
                value={draft.search ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value || undefined }))}
                onKeyDown={(e) => e.key === 'Enter' && apply()}
                className="w-full rounded-lg border border-slate-300 py-2 ps-8 pe-3 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </label>
        </div>
        <div className="mt-4 flex items-center gap-2">
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

      {isError ? (
        <QueryError onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <p className="text-sm text-slate-500">{t('common.loading')}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('rep.total')}</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{data.total}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('rep.approved')}</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{data.summary.aprobados}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <p className="text-xs uppercase tracking-wide text-slate-500">{t('rep.cancelledRejected')}</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{data.summary.rechazados}</p>
            </div>
          </div>

          {data.truncated && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {t('rep.truncated', { limit: data.limit })}
            </p>
          )}

          {/* Tabla de detalle */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
            {data.rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center">
                <InboxIcon className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">{t('rep.empty')}</p>
              </div>
            ) : (
              <table className="w-full min-w-[900px] text-start text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{t('rep.thClient')}</th>
                    <th className="px-4 py-3">{t('rep.thDocument')}</th>
                    <th className="px-4 py-3">{t('rep.thStatus')}</th>
                    <th className="px-4 py-3">{t('rep.thSent')}</th>
                    <th className="px-4 py-3">{t('rep.thDecided')}</th>
                    <th className="px-4 py-3">{t('rep.thReason')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.map((r) => (
                    <tr key={r.documentId} className="align-top hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{r.clientName}</div>
                        <div className="text-xs text-slate-500">{r.clientEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.docLabel}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[r.status]}`}
                        >
                          {statusLabel(t, r.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(r.uploadedAt)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.decidedAt ? (
                          <>
                            <div>{formatDate(r.decidedAt)}</div>
                            {r.deciderName && (
                              <div className="text-xs text-slate-400">{r.deciderName}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.comment ? r.comment : <span className="text-slate-400">—</span>}
                      </td>
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
