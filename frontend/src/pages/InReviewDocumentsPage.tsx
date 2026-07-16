import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '../api/documents.api';
import { DocumentReviewList, DOCS_ALL_KEY } from '../components/DocumentReviewList';
import { useI18n } from '../i18n';
import { DashboardLayout } from '../layouts/DashboardLayout';

// Documentos que compliance/admin están revisando. Desde aquí deciden
// enviarlos a aprobación de Dirección o cancelarlos.
export function InReviewDocumentsPage() {
  const { t } = useI18n();
  const { data: documents = [], isLoading } = useQuery({
    queryKey: DOCS_ALL_KEY,
    queryFn: documentsApi.listAll,
  });

  const inReview = documents.filter((d) => d.status === 'en_revision');

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">{t('review.inReviewTitle')}</h1>
        <p className="text-sm text-slate-500">{t('review.inReviewSubtitle')}</p>
      </div>

      <DocumentReviewList
        documents={inReview}
        isLoading={isLoading}
        allowReviewActions
        allowDecision={false}
        emptyText={t('review.emptyInReview')}
      />
    </DashboardLayout>
  );
}
