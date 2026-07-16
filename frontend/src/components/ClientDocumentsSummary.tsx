import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { documentsApi } from '../api/documents.api';
import { DOCUMENT_TYPES } from '../lib/documents';
import type { DocumentItem } from '../types';
import { DocumentTimeline } from './DocumentTimeline';

const DOCS_KEY = ['documents', 'mine'] as const;

// Panel del cliente: los 7 documentos requeridos, cada uno con una línea de
// tiempo que muestra en qué fase del flujo KYC se encuentra.
export function ClientDocumentsSummary() {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: DOCS_KEY,
    queryFn: documentsApi.listMine,
  });

  const byType = new Map<string, DocumentItem>();
  for (const doc of documents) {
    if (doc.docType) byType.set(doc.docType, doc);
  }

  const approvedCount = DOCUMENT_TYPES.filter(
    (t) => byType.get(t.key)?.status === 'aprobado',
  ).length;

  return (
    <section className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Estado de mis documentos</h2>
          <p className="text-sm text-slate-500">Sigue cada documento a lo largo del proceso.</p>
        </div>
        <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
          {approvedCount} / {DOCUMENT_TYPES.length} aprobados
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {DOCUMENT_TYPES.map((type) => (
            <DocumentTimeline
              key={type.key}
              docType={type.key}
              label={type.label}
              doc={byType.get(type.key)}
            />
          ))}
        </div>
      )}

      <Link
        to="/documents"
        className="mt-4 inline-flex text-sm font-medium text-brand-600 transition hover:text-brand-700"
      >
        Gestionar documentos →
      </Link>
    </section>
  );
}
