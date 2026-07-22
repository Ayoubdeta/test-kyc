import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { usePdfPreview } from '../hooks/usePdfPreview';
import { useI18n } from '../i18n';
import { docTypeLabel } from '../i18n/labels';
import { formatDate, formatDateTime } from '../lib/format';
import { StatusBadge } from './Badge';
import { PdfViewerModal } from './PdfViewerModal';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';

// Documentos actuales de un usuario (dentro del panel de administración).
export function UserDocumentsPanel({ userId }: { userId: string }) {
  const { t } = useI18n();
  const preview = usePdfPreview();
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['admin', 'user-docs', userId],
    queryFn: () => adminApi.getUserDocuments(userId),
  });

  if (isLoading) return <p className="py-6 text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</p>;
  if (documents.length === 0) {
    return <p className="py-6 text-sm text-slate-500 dark:text-slate-400">{t('panel.noDocs')}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {preview.error && <Alert>{preview.error}</Alert>}
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {documents.map((doc) => (
          <li key={doc.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {docTypeLabel(t, doc.docType)}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {doc.originalName} · {formatDateTime(doc.uploadedAt)}
              </p>
              {doc.status === 'aprobado' && doc.expiresAt && (
                <p className="text-xs text-green-700 dark:text-green-400">
                  {t('docs.validUntil', { date: formatDate(doc.expiresAt) })}
                </p>
              )}
              {doc.status === 'rechazado' && doc.reviewComment && (
                <p className="text-xs text-red-600 dark:text-red-400">{t('common.reason')}: {doc.reviewComment}</p>
              )}
            </div>
            <StatusBadge status={doc.status} />
            <Button variant="ghost" onClick={() => preview.preview(doc)}>
              {t('common.view')}
            </Button>
          </li>
        ))}
      </ul>

      <PdfViewerModal
        open={preview.state.open}
        title={preview.state.title}
        url={preview.state.url}
        loading={preview.state.loading}
        onClose={preview.close}
        onDownload={preview.download}
      />
    </div>
  );
}
