import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangleIcon, RefreshIcon } from './icons';
import { Button } from './ui/Button';
import { useI18n } from '../i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Contenido del fallback en su propio componente funcional para poder usar el
// hook de traducción (el ErrorBoundary debe ser una clase por requisito de React).
function ErrorFallback() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangleIcon className="h-12 w-12 text-red-500" />
      <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">{t('common.appError')}</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{t('common.appErrorHint')}</p>
      <Button variant="primary" onClick={() => window.location.reload()}>
        <RefreshIcon className="h-4 w-4" />
        {t('common.reload')}
      </Button>
    </div>
  );
}

// Captura los errores de render de todo el árbol para no dejar una pantalla en
// blanco: muestra un fallback con opción de recargar. Los errores de red/datos
// se gestionan con QueryError; este boundary es la red de seguridad para fallos
// de render inesperados.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // En producción esto podría enviarse a un servicio de observabilidad.
    console.error('[ErrorBoundary] Error de render no controlado:', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
