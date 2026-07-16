import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { getApiErrorMessage } from '../api/client';
import { documentsApi } from '../api/documents.api';
import { StatusBadge } from '../components/Badge';
import { DocTypeIcon } from '../components/icons';
import { PdfViewerModal } from '../components/PdfViewerModal';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { usePdfPreview } from '../hooks/usePdfPreview';
import { useI18n } from '../i18n';
import { docTypeLabel } from '../i18n/labels';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { DOCUMENT_TYPES } from '../lib/documents';
import { formatDate } from '../lib/format';
import type { DocumentItem, DocumentTypeKey } from '../types';

const DOCS_KEY = ['documents', 'mine'] as const;

export function ClientDocumentsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingType = useRef<DocumentTypeKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<DocumentTypeKey | null>(null);
  const preview = usePdfPreview();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: DOCS_KEY,
    queryFn: documentsApi.listMine,
  });

  // Documento actual por tipo (uno por tipo).
  const byType = new Map<string, DocumentItem>();
  for (const doc of documents) {
    if (doc.docType) byType.set(doc.docType, doc);
  }

  const approvedCount = DOCUMENT_TYPES.filter(
    (t) => byType.get(t.key)?.status === 'aprobado',
  ).length;

  const uploadMutation = useMutation({
    mutationFn: ({ docType, file }: { docType: DocumentTypeKey; file: File }) =>
      documentsApi.upload(docType, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCS_KEY }),
    onError: (err) => setError(getApiErrorMessage(err, t('docs.uploadError'))),
    onSettled: () => setUploadingType(null),
  });

  const triggerUpload = (docType: DocumentTypeKey) => {
    setError(null);
    pendingType.current = docType;
    fileInputRef.current?.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const docType = pendingType.current;
    if (file && docType) {
      if (file.type !== 'application/pdf') {
        setError(t('docs.onlyPdf'));
      } else {
        setUploadingType(docType);
        uploadMutation.mutate({ docType, file });
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    pendingType.current = null;
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('docs.title')}</h1>
          <p className="text-sm text-slate-500">{t('docs.subtitle')}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-card">
          <span className="font-semibold text-slate-800">
            {t('dashboard.approvedOf', { approved: approvedCount, total: DOCUMENT_TYPES.length })}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">{t('common.loading')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {DOCUMENT_TYPES.map((type) => {
            const doc = byType.get(type.key);
            const busy = uploadingType === type.key;
            return (
              <div
                key={type.key}
                className="flex animate-fade-in-up flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <DocTypeIcon docType={type.key} className="h-6 w-6 shrink-0 text-brand-600" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold leading-snug text-slate-800">
                      {docTypeLabel(t, type.key)}
                    </h3>
                    <div className="mt-1.5">
                      {doc ? (
                        <StatusBadge status={doc.status} />
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                          {t('common.notUploaded')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detalle según estado */}
                <div className="mt-3 min-h-[1.25rem] text-xs text-slate-500">
                  {doc?.status === 'aprobado' && doc.expiresAt && (
                    <span className="text-green-700">
                      {t('docs.validUntil', { date: formatDate(doc.expiresAt) })}
                    </span>
                  )}
                  {doc?.status === 'caducado' && (
                    <span className="text-amber-700">
                      {t('docs.expiredOn', { date: formatDate(doc.expiresAt) })}
                    </span>
                  )}
                  {doc?.status === 'rechazado' && (
                    <span className="text-red-600">
                      {doc.reviewComment
                        ? `${t('common.reason')}: ${doc.reviewComment}`
                        : t('docs.rejected')}
                    </span>
                  )}
                  {doc?.status === 'pendiente' && <span>{t('docs.pendingReview')}</span>}
                  {doc?.status === 'en_revision' && (
                    <span className="text-blue-700">{t('docs.inReview')}</span>
                  )}
                  {doc?.status === 'pendiente_aprobacion' && (
                    <span className="text-indigo-700">{t('docs.pendingApprovalByDireccion')}</span>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button onClick={() => triggerUpload(type.key)} isLoading={busy}>
                    {doc ? t('docs.replace') : t('docs.uploadPdf')}
                  </Button>
                  {doc && (
                    <Button variant="ghost" onClick={() => preview.preview(doc)}>
                      {t('common.view')}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Input de fichero compartido */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFile}
      />

      <PdfViewerModal
        open={preview.state.open}
        title={preview.state.title}
        url={preview.state.url}
        loading={preview.state.loading}
        onClose={preview.close}
        onDownload={preview.download}
      />
    </DashboardLayout>
  );
}
