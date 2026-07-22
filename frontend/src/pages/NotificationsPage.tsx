import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { notificationsApi } from '../api/notifications.api';
import { LIST_KEY, UNREAD_KEY } from '../components/NotificationBell';
import { NotificationIcon } from '../components/icons';
import { QueryError } from '../components/QueryError';
import { Button } from '../components/ui/Button';
import { useI18n } from '../i18n';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { notificationHref } from '../lib/documents';
import { formatDateTime } from '../lib/format';

export function NotificationsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, isError, refetch } = useQuery({
    queryKey: LIST_KEY,
    queryFn: notificationsApi.list,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: LIST_KEY });
    await queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
  };

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: notificationsApi.remove,
    onSuccess: invalidate,
  });

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">{t('notif.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('notif.pageSubtitle')}</p>
        </div>
        {hasUnread && (
          <Button variant="ghost" onClick={() => markAll.mutate()} isLoading={markAll.isPending}>
            {t('notif.markAll')}
          </Button>
        )}
      </div>

      {isError ? (
        <QueryError onRetry={() => refetch()} />
      ) : isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
      ) : notifications.length === 0 ? (
        <div className="animate-fade-in-up rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center shadow-card">
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('notif.empty')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex animate-fade-in-up gap-3 rounded-2xl border p-4 shadow-card transition ${
                n.read ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900' : 'border-brand-100 dark:border-brand-500/20 bg-brand-50 dark:bg-brand-500/10'
              }`}
            >
              <NotificationIcon type={n.type} className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <Link to={notificationHref(n.type)} className="group flex-1">
                    <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-brand-700 dark:group-hover:text-brand-400">
                      {n.title}
                    </h2>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    {!n.read && (
                      <span
                        className="h-2 w-2 rounded-full bg-brand-600"
                        aria-label={t('notif.unreadAria')}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => remove.mutate(n.id)}
                      className="rounded-md p-1 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-600 dark:hover:text-red-400"
                      aria-label={t('notif.deleteAria')}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <Link to={notificationHref(n.type)} className="block">
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{formatDateTime(n.createdAt)}</p>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardLayout>
  );
}
