import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '../api/documents.api';
import { DocumentReviewList, DOCS_ALL_KEY } from '../components/DocumentReviewList';
import { DashboardLayout } from '../layouts/DashboardLayout';

// Documentos pendientes de revisión (compliance/admin). Al pulsar "Ver" pasan
// a "en revisión"; desde ahí se envían a aprobación de Dirección o se cancelan.
export function PendingReviewDocumentsPage() {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: DOCS_ALL_KEY,
    queryFn: documentsApi.listAll,
  });

  const pending = documents.filter((d) => d.status === 'pendiente');

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Documentos por revisar</h1>
        <p className="text-sm text-slate-500">
          Documentos que los clientes han subido y esperan tu revisión. Al abrir uno con "Ver"
          pasará a "En revisión".
        </p>
      </div>

      <DocumentReviewList
        documents={pending}
        isLoading={isLoading}
        allowReviewActions
        allowDecision={false}
        emptyText="No hay documentos por revisar."
      />
    </DashboardLayout>
  );
}
