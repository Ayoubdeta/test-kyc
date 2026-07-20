import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '../api/documents.api';
import { DocumentReviewList, DOCS_ALL_KEY } from '../components/DocumentReviewList';
import { useI18n } from '../i18n';
import { DashboardLayout } from '../layouts/DashboardLayout';

// Bandeja de Dirección General: solo los documentos que compliance/admin ya
// revisaron y enviaron a aprobación (estado "pendiente_aprobacion").
export function PendingApprovalPage() {
  const { t } = useI18n();
  const { data: documents = [], isLoading, isError, refetch } = useQuery({
    queryKey: DOCS_ALL_KEY,
    queryFn: documentsApi.listAll,
  });

  const pending = documents.filter((d) => d.status === 'pendiente_aprobacion');

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">{t('review.approvalsTitle')}</h1>
        <p className="text-sm text-slate-500">{t('review.approvalsSubtitle')}</p>
      </div>

      <DocumentReviewList
        documents={pending}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        allowReviewActions={false}
        allowDecision
        emptyText={t('review.emptyApprovals')}
      />
    </DashboardLayout>
  );
}
