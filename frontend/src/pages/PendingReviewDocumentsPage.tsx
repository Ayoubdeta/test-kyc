import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '../api/documents.api';
import { DocumentReviewList, DOCS_ALL_KEY } from '../components/DocumentReviewList';
import { useI18n } from '../i18n';
import { DashboardLayout } from '../layouts/DashboardLayout';

// Documentos pendientes de revisión (compliance/admin). Al pulsar "Ver" pasan
// a "en revisión"; desde ahí se envían a aprobación de Dirección o se cancelan.
export function PendingReviewDocumentsPage() {
  const { t } = useI18n();
  const { data: documents = [], isLoading, isError, refetch } = useQuery({
    queryKey: DOCS_ALL_KEY,
    queryFn: documentsApi.listAll,
  });

  const pending = documents.filter((d) => d.status === 'pendiente');

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">{t('review.pendingTitle')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('review.pendingSubtitle')}</p>
      </div>

      <DocumentReviewList
        documents={pending}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        allowReviewActions
        allowDecision={false}
        emptyText={t('review.emptyPending')}
      />
    </DashboardLayout>
  );
}
