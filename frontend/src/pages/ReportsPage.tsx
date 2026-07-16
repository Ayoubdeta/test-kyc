import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { reportsApi } from '../api/reports.api';
import { FileTextIcon, InboxIcon, SearchIcon } from '../components/icons';
import { Button } from '../components/ui/Button';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { exportCsv, type CsvColumn } from '../lib/csv';
import { DOCUMENT_TYPES } from '../lib/documents';
import { formatDate } from '../lib/format';
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from '../lib/roles';
import type { DocumentStatus, DocumentTypeKey, ReportFilters, ReportRow } from '../types';

const STATUS_ORDER: DocumentStatus[] = [
  'pendiente',
  'en_revision',
  'pendiente_aprobacion',
  'aprobado',
  'rechazado',
  'caducado',
];

const EMPTY_FILTERS: ReportFilters = {};

// Columnas del CSV: una única fuente de verdad para la tabla y la exportación.
const CSV_COLUMNS: CsvColumn<ReportRow>[] = [
  { header: 'Cliente', value: (r) => r.clientName },
  { header: 'Email', value: (r) => r.clientEmail },
  { header: 'Documento', value: (r) => r.docLabel },
  { header: 'Archivo', value: (r) => r.originalName },
  { header: 'Estado', value: (r) => STATUS_LABELS[r.status] },
  { header: 'Enviado', value: (r) => formatDate(r.uploadedAt) },
  { header: 'Revisado por', value: (r) => r.reviewerName ?? '' },
  { header: 'Fecha revisión', value: (r) => (r.reviewedAt ? formatDate(r.reviewedAt) : '') },
  { header: 'Decidido por', value: (r) => r.deciderName ?? '' },
  { header: 'Fecha decisión', value: (r) => (r.decidedAt ? formatDate(r.decidedAt) : '') },
  { header: 'Caduca', value: (r) => (r.expiresAt ? formatDate(r.expiresAt) : '') },
  { header: 'Motivo', value: (r) => r.comment ?? '' },
];

export function ReportsPage() {
  const [draft, setDraft] = useState<ReportFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<ReportFilters>(EMPTY_FILTERS);

  const { data, isLoading, isFetching } = useQuery({
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
          <h1 className="text-xl font-bold text-slate-900">Informes</h1>
          <p className="text-sm text-slate-500">
            Detalle de documentos por fecha, tipo y estado (incluye cancelados y su motivo).
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={handleExport}
          disabled={!data || data.rows.length === 0}
        >
          <FileTextIcon className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Barra de filtros modular */}
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
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Cliente</span>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Nombre o email"
                value={draft.search ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value || undefined }))}
                onKeyDown={(e) => e.key === 'Enter' && apply()}
                className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </label>
        </div>
        <div className="mt-4 flex items-center gap-2">
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

      {isLoading || !data ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{data.total}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <p className="text-xs uppercase tracking-wide text-slate-500">Aprobados</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{data.summary.aprobados}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <p className="text-xs uppercase tracking-wide text-slate-500">Cancelados / rechazados</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{data.summary.rechazados}</p>
            </div>
          </div>

          {data.truncated && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Mostrando las primeras {data.limit} filas. Afina los filtros para acotar el informe.
            </p>
          )}

          {/* Tabla de detalle */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
            {data.rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center">
                <InboxIcon className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">Sin resultados para estos filtros.</p>
              </div>
            ) : (
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Documento</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Enviado</th>
                    <th className="px-4 py-3">Decidido</th>
                    <th className="px-4 py-3">Motivo</th>
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
                          {STATUS_LABELS[r.status]}
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
