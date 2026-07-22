import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { THEMES, type Theme } from '../theme/config';

// Iconos SVG propios (coherentes con icons.tsx). Sol para claro, luna para
// oscuro, monitor para automático.
function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// Selector de tema. <select> nativo (accesible y sin recortes en menús con
// overflow), en línea con LanguageSwitcher.
export function ThemeSwitcher({ className }: { className?: string }) {
  const { t } = useI18n();
  const { theme, effective, setTheme } = useTheme();

  return (
    <label
      className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 ${
        className ?? ''
      }`}
    >
      {effective === 'dark' ? (
        <MoonIcon className="h-4 w-4 shrink-0 text-slate-400" />
      ) : (
        <SunIcon className="h-4 w-4 shrink-0 text-slate-400" />
      )}
      <span className="sr-only">{t('theme.label')}</span>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        aria-label={t('theme.label')}
        className="cursor-pointer appearance-none bg-transparent pe-1 font-medium outline-none dark:bg-slate-800"
      >
        {THEMES.map((th) => (
          <option key={th} value={th}>
            {t(`theme.${th}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
