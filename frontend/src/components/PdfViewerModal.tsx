import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import { Button } from './ui/Button';

interface PdfViewerModalProps {
  open: boolean;
  title: string;
  /** Object URL del PDF (creado a partir del blob descargado). */
  url: string | null;
  loading?: boolean;
  onClose: () => void;
  onDownload: () => void;
}

// Visor de PDF embebido en la propia web (iframe sobre un object URL). No abre
// pestañas nuevas. Incluye botón de descarga y cierre con Escape / fondo.
export function PdfViewerModal({
  open,
  title,
  url,
  loading = false,
  onClose,
  onDownload,
}: PdfViewerModalProps) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Portal a document.body: así el overlay vive en el contexto de apilamiento
  // raíz y su z-50 siempre queda por encima del header (z-30), sin que lo atrape
  // el stacking context que crea el <main> durante su animación de entrada.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Vista previa de ${title}`}
      onClick={onClose}
    >
      <div
        className="flex h-[90vh] w-full max-w-4xl animate-scale-in flex-col overflow-hidden rounded-2xl bg-white shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3">
          <h2 className="truncate text-sm font-semibold text-slate-800" title={title}>
            {title}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="primary" onClick={onDownload} disabled={!url}>
              {t('pdf.download')}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              {t('pdf.close')}
            </Button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 bg-slate-100">
          {loading || !url ? (
            <div className="flex h-full items-center justify-center" role="status">
              <span
                className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"
                aria-hidden="true"
              />
              <span className="sr-only">{t('pdf.loadingDoc')}</span>
            </div>
          ) : (
            <iframe src={url} title={`PDF: ${title}`} className="h-full w-full border-0" />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
