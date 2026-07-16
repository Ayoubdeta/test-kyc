import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '../api/documents.api';
import { DocumentReviewList, DOCS_ALL_KEY } from '../components/DocumentReviewList';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { canApprove, canReview } from '../lib/roles';

export function ReviewDocumentsPage() {
  const { me } = useAuth();
  const { t } = useI18n();
  const role = me?.user.role;

  const { data: documents = [], isLoading } = useQuery({
    queryKey: DOCS_ALL_KEY,
    queryFn: documentsApi.listAll,
  });

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">{t('review.byUserTitle')}</h1>
        <p className="text-sm text-slate-500">
          {canApprove(role)
            ? t('review.byUserSubtitleApprove')
            : t('review.byUserSubtitleReview')}
        </p>
      </div>

      <DocumentReviewList
        documents={documents}
        isLoading={isLoading}
        allowReviewActions={canReview(role)}
        allowDecision={canApprove(role)}
        emptyText={t('review.emptyAll')}
      />
    </DashboardLayout>
  );
}
