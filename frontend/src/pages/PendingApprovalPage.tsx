import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '../api/documents.api';
import { DocumentReviewList, DOCS_ALL_KEY } from '../components/DocumentReviewList';
import { DashboardLayout } from '../layouts/DashboardLayout';

// Bandeja de Dirección General: solo los documentos que compliance/admin ya
// revisaron y enviaron a aprobación (estado "pendiente_aprobacion").
export function PendingApprovalPage() {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: DOCS_ALL_KEY,
    queryFn: documentsApi.listAll,
  });

  const pending = documents.filter((d) => d.status === 'pendiente_aprobacion');

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Documentos pendientes de aprobar</h1>
        <p className="text-sm text-slate-500">
          Documentos revisados por compliance o administración que esperan tu aprobación.
        </p>
      </div>

      <DocumentReviewList
        documents={pending}
        isLoading={isLoading}
        allowReviewActions={false}
        allowDecision
        emptyText="No hay documentos pendientes de aprobar."
      />
    </DashboardLayout>
  );
}
