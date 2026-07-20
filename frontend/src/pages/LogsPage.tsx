import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { logsApi } from '../api/logs.api';
import { InboxIcon, SearchIcon } from '../components/icons';
import { QueryError } from '../components/QueryError';
import { Button } from '../components/ui/Button';
import { useI18n } from '../i18n';
import { logActionLabel, roleLabel } from '../i18n/labels';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { formatDateTime } from '../lib/format';
import { LOG_ACTION_BADGE, LOG_ACTION_ORDER } from '../lib/logs';
import type { LogAction, LogFilters } from '../types';

const PAGE_SIZE = 50;
const EMPTY_FILTERS: LogFilters = {};

export function LogsPage() {
  const { t } = useI18n();
  const [draft, setDraft] = useState<LogFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<LogFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['logs', applied, page],
    queryFn: () => logsApi.list({ ...applied, page, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev, // evita parpadeo al paginar
  });

  const hasFilters = Boolean(applied.from || applied.to || applied.action || applied.search);

  const apply = () => {
    setPage(1);
    setApplied(draft);
  };
  const reset = () => {
    setPage(1);
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  };

  const totalPages = data?.totalPages ?? 1;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">{t('log.pageTitle')}</h1>
        <p className="text-sm text-slate-500">{t('log.subtitle')}</p>
      </div>

      {/* Barra de filtros */}
      <div className="mb-6 animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <span className="font-medium text-slate-700">{t('log.action')}</span>
            <select
              value={draft.action ?? ''}
              onChange={(e) =>
                setDraft((d) => ({ ...d, action: (e.target.value || undefined) as LogAction | undefined }))
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">{t('log.allActions')}</option>
              {LOG_ACTION_ORDER.map((a) => (
                <option key={a} value={a}>
                  {logActionLabel(t, a)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">{t('log.search')}</span>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('log.searchPlaceholder')}
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
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
            {data.logs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center">
                <InboxIcon className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">{t('log.empty')}</p>
              </div>
            ) : (
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{t('log.thDate')}</th>
                    <th className="px-4 py-3">{t('log.thUser')}</th>
                    <th className="px-4 py-3">{t('log.thAction')}</th>
                    <th className="px-4 py-3">{t('log.thDetail')}</th>
                    <th className="px-4 py-3">{t('log.thIp')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.logs.map((log) => (
                    <tr key={log.id} className="align-top hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {log.actorLabel ?? <span className="text-slate-400">—</span>}
                        </div>
                        {log.actorRole && (
                          <div className="text-xs text-slate-400">{roleLabel(t, log.actorRole)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${LOG_ACTION_BADGE[log.action]}`}
                        >
                          {logActionLabel(t, log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {log.description ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                        {log.ip ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              {t('log.pagination', { total: data.total, page: data.page, pages: totalPages })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
              >
                {t('log.prev')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={data.page >= totalPages}
              >
                {t('log.next')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
