import { useI18n } from '../i18n';
import { useCountdown } from '../hooks/useCountdown';
import { AlertTriangleIcon, ClockIcon } from './icons';

// Umbral de aviso de caducidad (en días). Coincide con EXPIRY_WARNING_DAYS del
// backend (backend/src/config/constants.ts): 15 días.
const WARNING_DAYS = 15;

type Tone = 'ok' | 'warn' | 'expired';

function toneOf(days: number, expired: boolean): Tone {
  if (expired) return 'expired';
  return days < WARNING_DAYS ? 'warn' : 'ok';
}

// Texto compacto "89d 04h 12m 33s" con dígitos de ancho fijo para que no baile.
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

interface Props {
  /** Fecha ISO de caducidad (documents.expiresAt). */
  expiresAt: string | null | undefined;
  variant?: 'inline' | 'card';
  /** Nombre del documento (solo en la variante 'card'). */
  label?: string;
  className?: string;
}

// Cuenta atrás en vivo hasta la caducidad de un documento. Cambia de color al
// acercarse (ámbar en los últimos 15 días) y al caducar (rojo).
export function ExpiryCountdown({ expiresAt, variant = 'inline', label, className = '' }: Props) {
  const { t } = useI18n();
  const cd = useCountdown(expiresAt);
  if (!cd) return null;

  const tone = toneOf(cd.days, cd.expired);

  const time = cd.expired
    ? t('countdown.expired')
    : `${cd.days}${t('countdown.unitDay')} ${pad(cd.hours)}${t('countdown.unitHour')} ${pad(
        cd.minutes,
      )}${t('countdown.unitMin')} ${pad(cd.seconds)}${t('countdown.unitSec')}`;

  if (variant === 'card') {
    const cardTone: Record<Tone, string> = {
      ok: 'border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400',
      warn: 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
      expired: 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400',
    };
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl border p-4 shadow-card ${cardTone[tone]} ${className}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70">
          {tone === 'expired' ? (
            <AlertTriangleIcon className="h-5 w-5" />
          ) : (
            <ClockIcon className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium opacity-80">{t('countdown.nextExpiry')}</p>
          {label && <p className="truncate text-sm font-semibold">{label}</p>}
          <p className="text-lg font-bold tabular-nums leading-tight">{time}</p>
        </div>
      </div>
    );
  }

  // Variante inline (dentro de la línea de tiempo del documento).
  const inlineTone: Record<Tone, string> = {
    ok: 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400',
    warn: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
    expired: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${inlineTone[tone]} ${className}`}
    >
      {tone === 'expired' ? (
        <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <ClockIcon className="h-3.5 w-3.5 shrink-0" />
      )}
      {cd.expired ? (
        <span>{t('countdown.expired')}</span>
      ) : (
        <span>
          {t('countdown.expiresIn')} <span className="font-semibold tabular-nums">{time}</span>
        </span>
      )}
    </span>
  );
}
