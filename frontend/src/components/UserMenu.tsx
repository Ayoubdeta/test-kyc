import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from './Avatar';
import { RoleBadge } from './Badge';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { LogOutIcon, SettingsIcon } from './icons';

// Menú de usuario en la cabecera: al pulsar el avatar o el nombre se despliega
// un panel con los datos de la cuenta, acceso a configurar el perfil y salir.
// Disponible para todos los roles (cliente y personal interno).
export function UserMenu() {
  const { me, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cierra el menú al hacer clic fuera o pulsar Escape.
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

  if (!me) return null;

  const { user, profile } = me;
  const displayName = profile.fullName ?? user.username;

  const handleLogout = async () => {
    setError(null);
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, t('userMenu.logoutError')));
      setLoggingOut(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl py-1 ps-1 pe-2 text-white/90 transition hover:bg-white/10"
        aria-label={t('userMenu.openMenu')}
        aria-expanded={open}
      >
        <Avatar src={profile.avatarUrl} name={displayName} size="sm" />
        <span className="hidden max-w-[9rem] truncate text-sm font-medium sm:inline">
          {user.username}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 text-white/70 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute end-0 z-40 mt-2 w-72 origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-elevated">
          {/* Cabecera con la identidad del usuario */}
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-4">
            <Avatar src={profile.avatarUrl} name={displayName} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{displayName}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-2.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">{t('common.role')}</span>
            <RoleBadge role={user.role} />
          </div>

          {/* Selección de idioma */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 px-4 py-2.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">{t('switcher.label')}</span>
            <LanguageSwitcher />
          </div>

          {/* Selección de tema */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 px-4 py-2.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">{t('theme.label')}</span>
            <ThemeSwitcher />
          </div>

          {/* Acciones */}
          <div className="p-1.5">
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <SettingsIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              {t('userMenu.editProfile')}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
            >
              <LogOutIcon className="h-4 w-4" />
              {loggingOut ? t('userMenu.loggingOut') : t('userMenu.logout')}
            </button>
          </div>

          {error && (
            <p className="border-t border-slate-100 dark:border-slate-800 px-4 py-2 text-xs text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
