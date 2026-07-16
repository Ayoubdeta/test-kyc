import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { useI18n } from '../i18n';
import { docTypeLabel, eventLabel } from '../i18n/labels';
import { EVENT_META } from '../lib/documents';
import { formatDate, formatDateTime } from '../lib/format';
import { EventIcon } from './icons';

// Historial de eventos de documentos de un usuario (panel de administración).
export function UserHistoryPanel({ userId }: { userId: string }) {
  const { t } = useI18n();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['admin', 'user-history', userId],
    queryFn: () => adminApi.getUserHistory(userId),
  });

  if (isLoading) return <p className="py-6 text-sm text-slate-500">{t('common.loading')}</p>;
  if (events.length === 0) {
    return <p className="py-6 text-sm text-slate-500">{t('panel.noActivity')}</p>;
  }

  return (
    <ol className="relative flex flex-col gap-4 border-l border-slate-200 pl-6">
      {events.map((ev) => {
        const meta = EVENT_META[ev.eventType];
        return (
          <li key={ev.id} className="relative">
            <span
              className={`absolute -left-[1.9rem] top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${meta.dot}`}
              aria-hidden="true"
            />
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <EventIcon type={ev.eventType} className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-800">{eventLabel(t, ev.eventType)}</span>
                  <span className="text-sm text-slate-500">· {docTypeLabel(t, ev.docType)}</span>
                </div>
                <span className="text-xs text-slate-400">{formatDateTime(ev.createdAt)}</span>
              </div>
              {ev.eventType === 'aprobado' && ev.expiresAt && (
                <p className="mt-1 text-xs text-green-700">
                  {t('docs.validUntil', { date: formatDate(ev.expiresAt) })}
                </p>
              )}
              {ev.eventType === 'rechazado' && (
                <p className="mt-1 text-xs text-red-600">
                  {ev.comment ? `${t('common.reason')}: ${ev.comment}` : t('history.noReason')}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
