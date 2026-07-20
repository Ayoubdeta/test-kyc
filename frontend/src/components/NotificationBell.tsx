import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { notificationsApi } from '../api/notifications.api';
import { useI18n } from '../i18n';
import { notificationHref } from '../lib/documents';
import { formatDateTime } from '../lib/format';
import { NotificationIcon } from './icons';

export const UNREAD_KEY = ['notifications', 'unread'] as const;
export const LIST_KEY = ['notifications', 'list'] as const;

// Nº máximo de notificaciones que se muestran en el desplegable de la campana.
const PREVIEW_LIMIT = 6;

// Campana de notificaciones: muestra el contador de no leídas y, al pulsarla,
// despliega un panel con las últimas notificaciones (con opción de borrarlas).
export function NotificationBell() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: count = 0 } = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  // La lista solo se consulta cuando el panel está abierto (evita tráfico
  // innecesario); el contador de la campana ya cubre el aviso pasivo.
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: LIST_KEY,
    queryFn: notificationsApi.list,
    enabled: open,
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

  // Cierra el panel al hacer clic fuera o pulsar Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const preview = notifications.slice(0, PREVIEW_LIMIT);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/10"
        aria-label={
          count > 0 ? `${t('notif.title')} (${t('notif.unreadCount', { count })})` : t('notif.title')
        }
        aria-expanded={open}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-brand-700 ring-2 ring-brand-600">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-40 mt-2 w-80 origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-elevated">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">{t('notif.title')}</span>
            {notifications.some((n) => !n.read) && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                disabled={markAll.isPending}
              >
                {t('notif.markRead')}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">{t('common.loading')}</p>
            ) : preview.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                {t('notif.empty')}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {preview.map((n) => (
                  <li
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 ${n.read ? '' : 'bg-brand-50/60'}`}
                  >
                    <Link
                      to={notificationHref(n.type)}
                      onClick={() => setOpen(false)}
                      className="flex min-w-0 flex-1 gap-3"
                    >
                      <NotificationIcon
                        type={n.type}
                        className="mt-0.5 h-5 w-5 shrink-0 text-slate-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{n.message}</p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatDateTime(n.createdAt)}
                        </p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove.mutate(n.id)}
                      className="shrink-0 self-start rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
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
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-100 px-4 py-2.5 text-center text-sm font-medium text-brand-600 transition hover:bg-slate-50"
          >
            {t('notif.viewAll')}
          </Link>
        </div>
      )}
    </div>
  );
}
