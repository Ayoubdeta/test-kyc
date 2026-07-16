import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '../api/documents.api';
import { DocumentReviewList, DOCS_ALL_KEY } from '../components/DocumentReviewList';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { canApprove, canReview } from '../lib/roles';

export function ReviewDocumentsPage() {
  const { me } = useAuth();
  const role = me?.user.role;

  const { data: documents = [], isLoading } = useQuery({
    queryKey: DOCS_ALL_KEY,
    queryFn: documentsApi.listAll,
  });

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Documentos por usuario</h1>
        <p className="text-sm text-slate-500">
          {canApprove(role)
            ? 'Haz clic en un usuario para ver sus documentos. Aprueba o rechaza los que están pendientes de aprobación.'
            : 'Haz clic en un usuario para ver sus documentos. Al abrir un pendiente pasa a "En revisión"; desde ahí, envíalo a aprobación o cancélalo.'}
        </p>
      </div>

      <DocumentReviewList
        documents={documents}
        isLoading={isLoading}
        allowReviewActions={canReview(role)}
        allowDecision={canApprove(role)}
        emptyText="No hay documentos subidos todavía."
      />
    </DashboardLayout>
  );
}
