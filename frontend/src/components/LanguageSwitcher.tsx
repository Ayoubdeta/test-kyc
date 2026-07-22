import { LANGUAGES, type Lang } from '../i18n/config';
import { useI18n } from '../i18n';

// Icono de globo (SVG propio, sin dependencias — coherente con icons.tsx).
function GlobeIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// Selector de idioma. Usa un <select> nativo: accesible, robusto y sin
// problemas de recorte al ir dentro de contenedores con overflow (p. ej. el
// panel del menú de usuario) ni en modo RTL.
export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();

  return (
    <label
      className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 ${
        className ?? ''
      }`}
    >
      <GlobeIcon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
      <span className="sr-only">{t('switcher.label')}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        aria-label={t('switcher.label')}
        className="cursor-pointer appearance-none bg-transparent pe-1 font-medium outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {t(`lang.${l.code}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
