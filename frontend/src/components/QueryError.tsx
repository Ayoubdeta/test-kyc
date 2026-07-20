import { AlertTriangleIcon, RefreshIcon } from './icons';
import { Button } from './ui/Button';
import { useI18n } from '../i18n';

interface QueryErrorProps {
  /** Reintenta la consulta fallida (normalmente el `refetch` de useQuery). */
  onRetry?: () => void;
  /** Mensaje opcional; por defecto usa el texto genérico de carga fallida. */
  message?: string;
}

// Estado de error reutilizable para las páginas con React Query. Cuando un fetch
// falla (algo distinto de un 401, que ya gestiona el interceptor de axios), se
// muestra este bloque con opción de reintentar, en vez de dejar la pantalla
// vacía o "cargando" para siempre.
export function QueryError({ onRetry, message }: QueryErrorProps) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-8 text-center"
    >
      <AlertTriangleIcon className="h-8 w-8 text-red-500" />
      <p className="text-sm font-medium text-red-700">{message ?? t('common.loadError')}</p>
      {onRetry && (
        <Button variant="ghost" onClick={onRetry}>
          <RefreshIcon className="h-4 w-4" />
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}
