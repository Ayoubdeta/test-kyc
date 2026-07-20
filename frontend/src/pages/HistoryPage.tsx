import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { documentsApi } from '../api/documents.api';
import { EventIcon, FolderIcon } from '../components/icons';
import { QueryError } from '../components/QueryError';
import { useI18n } from '../i18n';
import { docTypeLabel, eventLabel } from '../i18n/labels';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { EVENT_META } from '../lib/documents';
import { formatDate, formatDateTime } from '../lib/format';
import type { DocumentEventType } from '../types';

const HISTORY_KEY = ['documents', 'history'] as const;

export function HistoryPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const active = params.get('estado') ?? '';

  // Filtros de la barra superior. El valor vacío significa "Todos".
  const FILTERS: { key: '' | DocumentEventType; label: string }[] = [
    { key: '', label: t('history.filterAll') },
    { key: 'subido', label: t('history.filterUploaded') },
    { key: 'revisado', label: t('history.filterInReview') },
    { key: 'aprobado', label: t('history.filterApproved') },
    { key: 'rechazado', label: t('history.filterRejected') },
    { key: 'caducado', label: t('history.filterExpired') },
  ];

  const { data: events = [], isLoading, isError, refetch } = useQuery({
    queryKey: HISTORY_KEY,
    queryFn: documentsApi.history,
  });

  const filtered = active ? events.filter((e) => e.eventType === active) : events;

  const setFilter = (key: string) => {
    setParams(key ? { estado: key } : {}, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">{t('history.title')}</h1>
        <p className="text-sm text-slate-500">{t('history.subtitle')}</p>
      </div>

      {/* Filtros por estado */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const isActive = active === f.key;
          return (
            <button
              key={f.key || 'todos'}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {isError ? (
        <QueryError onRetry={() => refetch()} />
      ) : isLoading ? (
        <p className="text-sm text-slate-500">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-card">
          <FolderIcon className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            {active ? t('history.emptyFiltered') : t('history.empty')}
          </p>
        </div>
      ) : (
        <ol className="relative flex flex-col gap-4 border-s border-slate-200 ps-6">
          {filtered.map((ev) => {
            const meta = EVENT_META[ev.eventType];
            return (
              <li key={ev.id} className="relative animate-fade-in-up">
                {/* Punto del timeline */}
                <span
                  className={`absolute -start-[1.9rem] top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${meta.dot}`}
                  aria-hidden="true"
                />
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <EventIcon type={ev.eventType} className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-semibold text-slate-800">
                        {eventLabel(t, ev.eventType)}
                      </span>
                      <span className="text-sm text-slate-500">
                        · {docTypeLabel(t, ev.docType)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">{formatDateTime(ev.createdAt)}</span>
                  </div>

                  {/* Detalle según el tipo de evento */}
                  {ev.eventType === 'aprobado' && ev.expiresAt && (
                    <p className="mt-1.5 text-xs text-green-700">
                      {t('docs.validUntil', { date: formatDate(ev.expiresAt) })}
                    </p>
                  )}
                  {ev.eventType === 'rechazado' && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {ev.comment ? `${t('common.reason')}: ${ev.comment}` : t('history.noReason')}
                    </p>
                  )}
                  {ev.originalName && (
                    <p className="mt-1 text-xs text-slate-400">{ev.originalName}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </DashboardLayout>
  );
}
