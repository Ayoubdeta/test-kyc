import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { getApiErrorMessage } from '../api/client';
import { documentsApi, type DecisionPayload } from '../api/documents.api';
import { usePdfPreview } from '../hooks/usePdfPreview';
import { documentTypeLabel } from '../lib/documents';
import { formatBytes, formatDate, formatDateTime } from '../lib/format';
import type { DocumentItem } from '../types';
import { StatusBadge } from './Badge';
import { PdfViewerModal } from './PdfViewerModal';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { TextArea } from './ui/TextArea';

export const DOCS_ALL_KEY = ['documents', 'all'] as const;

const VALIDITY_OPTIONS = [
  { months: 6, label: '6 meses' },
  { months: 12, label: '12 meses' },
  { months: 24, label: '24 meses' },
  { months: 36, label: '36 meses' },
];

interface UserGroup {
  ownerId: string;
  name: string;
  email: string;
  docs: DocumentItem[];
  approved: number;
  pending: number;
  inReview: number;
  pendingApproval: number;
}

interface Props {
  documents: DocumentItem[];
  /**
   * Acciones de revisión de compliance/admin:
   *  - al pulsar "Ver" un documento PENDIENTE pasa a "en revisión";
   *  - en un documento EN REVISIÓN se muestran "Enviar a aprobación" y "Cancelar".
   */
  allowReviewActions: boolean;
  /** Muestra Aprobar/Rechazar en documentos pendientes de aprobación (Dirección). */
  allowDecision: boolean;
  isLoading?: boolean;
  emptyText?: string;
}

type DecisionTarget = { doc: DocumentItem; status: 'aprobado' | 'rechazado' } | null;
type ReviewAction = 'enviar_aprobacion' | 'cancelar';
type ReviewTarget = { doc: DocumentItem; action: ReviewAction } | null;

// Lista de documentos agrupada por usuario (colapsable). Cada revisor ve las
// acciones que le corresponden según su rol.
export function DocumentReviewList({
  documents,
  allowReviewActions,
  allowDecision,
  isLoading = false,
  emptyText = 'No hay documentos.',
}: Props) {
  const queryClient = useQueryClient();
  const preview = usePdfPreview();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const [decisionTarget, setDecisionTarget] = useState<DecisionTarget>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [validityMonths, setValidityMonths] = useState(12);

  const [reviewTarget, setReviewTarget] = useState<ReviewTarget>(null);
  const [reviewComment, setReviewComment] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: DOCS_ALL_KEY });

  // Al abrir un documento pendiente con "Ver", pasa a "en revisión".
  const startReview = useMutation({
    mutationFn: (id: string) => documentsApi.startReview(id),
    onSuccess: invalidate,
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo poner en revisión')),
  });

  // Decisión de compliance/admin sobre un documento en revisión.
  const reviewMutation = useMutation({
    mutationFn: ({ id, action, comment }: { id: string; action: ReviewAction; comment?: string }) =>
      action === 'cancelar'
        ? documentsApi.cancelReview(id, comment)
        : documentsApi.sendToApproval(id, comment),
    onSuccess: async () => {
      await invalidate();
      setReviewTarget(null);
      setReviewComment('');
    },
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo completar la revisión')),
  });

  const decisionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DecisionPayload }) =>
      documentsApi.decide(id, payload),
    onSuccess: async () => {
      await invalidate();
      setDecisionTarget(null);
      setDecisionComment('');
    },
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo guardar la decisión')),
  });

  const handleView = (doc: DocumentItem) => {
    setError(null);
    preview.preview(doc);
    // Al abrir un pendiente, un revisor lo pone automáticamente en revisión.
    if (allowReviewActions && doc.status === 'pendiente') {
      startReview.mutate(doc.id);
    }
  };

  const groups = useMemo<UserGroup[]>(() => {
    const map = new Map<string, UserGroup>();
    for (const doc of documents) {
      const ownerId = doc.owner?.id ?? 'desconocido';
      if (!map.has(ownerId)) {
        map.set(ownerId, {
          ownerId,
          name: doc.owner?.fullName || doc.owner?.username || 'Usuario',
          email: doc.owner?.email ?? '',
          docs: [],
          approved: 0,
          pending: 0,
          inReview: 0,
          pendingApproval: 0,
        });
      }
      const g = map.get(ownerId)!;
      g.docs.push(doc);
      if (doc.status === 'aprobado') g.approved += 1;
      else if (doc.status === 'pendiente') g.pending += 1;
      else if (doc.status === 'en_revision') g.inReview += 1;
      else if (doc.status === 'pendiente_aprobacion') g.pendingApproval += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [documents]);

  const toggle = (ownerId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(ownerId)) next.delete(ownerId);
      else next.add(ownerId);
      return next;
    });
  };

  const openDecision = (doc: DocumentItem, status: 'aprobado' | 'rechazado') => {
    setError(null);
    setDecisionComment('');
    setValidityMonths(12);
    setDecisionTarget({ doc, status });
  };

  const openReview = (doc: DocumentItem, action: ReviewAction) => {
    setError(null);
    setReviewComment('');
    setReviewTarget({ doc, action });
  };

  const confirmReview = () => {
    if (!reviewTarget) return;
    reviewMutation.mutate({
      id: reviewTarget.doc.id,
      action: reviewTarget.action,
      comment: reviewComment.trim() || undefined,
    });
  };

  const confirmDecision = () => {
    if (!decisionTarget) return;
    const payload: DecisionPayload = {
      status: decisionTarget.status,
      comment: decisionComment.trim() || undefined,
      ...(decisionTarget.status === 'aprobado' ? { validityMonths } : {}),
    };
    decisionMutation.mutate({ id: decisionTarget.doc.id, payload });
  };

  if (isLoading) {
    return <p className="text-sm text-slate-500">Cargando…</p>;
  }

  if (groups.length === 0) {
    return (
      <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-card">
        <p className="text-3xl" aria-hidden="true">
          🗂️
        </p>
        <p className="mt-2 text-sm text-slate-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <>
      {(error || preview.error) && (
        <div className="mb-4">
          <Alert>{error ?? preview.error}</Alert>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {groups.map((g) => {
          const isOpen = expanded.has(g.ownerId);
          return (
            <div
              key={g.ownerId}
              className="animate-fade-in-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
            >
              <button
                type="button"
                onClick={() => toggle(g.ownerId)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                aria-expanded={isOpen}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{g.name}</p>
                  <p className="truncate text-xs text-slate-500">{g.email}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {g.pending > 0 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                      {g.pending} pendiente{g.pending === 1 ? '' : 's'}
                    </span>
                  )}
                  {g.inReview > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">
                      {g.inReview} en revisión
                    </span>
                  )}
                  {g.pendingApproval > 0 && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700">
                      {g.pendingApproval} por aprobar
                    </span>
                  )}
                  <span className="rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-700">
                    {g.approved} aprobado{g.approved === 1 ? '' : 's'}
                  </span>
                  <span className="text-slate-400">{g.docs.length} docs</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </button>

              {isOpen && (
                <ul className="divide-y divide-slate-100 border-t border-slate-100">
                  {g.docs.map((doc) => (
                    <li key={doc.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">
                          {documentTypeLabel(doc.docType)}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {doc.originalName} · {formatBytes(doc.sizeBytes)} ·{' '}
                          {formatDateTime(doc.uploadedAt)}
                        </p>
                        {doc.status === 'aprobado' && doc.expiresAt && (
                          <p className="text-xs text-green-700">
                            Válido hasta el {formatDate(doc.expiresAt)}
                          </p>
                        )}
                        {doc.status === 'caducado' && (
                          <p className="text-xs text-amber-700">
                            Caducó el {formatDate(doc.expiresAt)}
                          </p>
                        )}
                        {(doc.status === 'rechazado' ||
                          doc.status === 'en_revision' ||
                          doc.status === 'pendiente_aprobacion') &&
                          doc.reviewComment && (
                            <p className="text-xs text-slate-500">“{doc.reviewComment}”</p>
                          )}
                      </div>
                      <StatusBadge status={doc.status} />
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" onClick={() => handleView(doc)}>
                          Ver
                        </Button>
                        {allowReviewActions && doc.status === 'en_revision' && (
                          <>
                            <Button
                              variant="primary"
                              onClick={() => openReview(doc, 'enviar_aprobacion')}
                            >
                              Enviar a aprobación
                            </Button>
                            <Button variant="danger" onClick={() => openReview(doc, 'cancelar')}>
                              Cancelar
                            </Button>
                          </>
                        )}
                        {allowDecision && doc.status === 'pendiente_aprobacion' && (
                          <>
                            <Button variant="success" onClick={() => openDecision(doc, 'aprobado')}>
                              Aprobar
                            </Button>
                            <Button variant="danger" onClick={() => openDecision(doc, 'rechazado')}>
                              Rechazar
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: decisión de revisión (enviar a aprobación / cancelar) */}
      <Modal
        open={reviewTarget !== null}
        title={
          reviewTarget?.action === 'cancelar' ? 'Cancelar documento' : 'Enviar a aprobación'
        }
        onClose={() => setReviewTarget(null)}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            {documentTypeLabel(reviewTarget?.doc.docType ?? null)} ·{' '}
            {reviewTarget?.doc.owner?.email}
          </p>

          <p className="text-sm text-slate-500">
            {reviewTarget?.action === 'cancelar'
              ? 'El documento quedará rechazado y se avisará al cliente con el motivo para que lo vuelva a enviar corregido.'
              : 'El documento pasará a estar pendiente de aprobación por Dirección General.'}
          </p>

          <TextArea
            label={
              reviewTarget?.action === 'cancelar'
                ? 'Motivo (recomendado)'
                : 'Comentario (opcional)'
            }
            name="reviewComment"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setReviewTarget(null)}>
              Volver
            </Button>
            <Button
              variant={reviewTarget?.action === 'cancelar' ? 'danger' : 'primary'}
              onClick={confirmReview}
              isLoading={reviewMutation.isPending}
            >
              {reviewTarget?.action === 'cancelar' ? 'Cancelar documento' : 'Enviar a aprobación'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: decisión de Dirección */}
      <Modal
        open={decisionTarget !== null}
        title={decisionTarget?.status === 'aprobado' ? 'Aprobar documento' : 'Rechazar documento'}
        onClose={() => setDecisionTarget(null)}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            {documentTypeLabel(decisionTarget?.doc.docType ?? null)} ·{' '}
            {decisionTarget?.doc.owner?.email}
          </p>

          {decisionTarget?.status === 'aprobado' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="validity" className="text-sm font-medium text-slate-700">
                Validez del documento
              </label>
              <select
                id="validity"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                value={validityMonths}
                onChange={(e) => setValidityMonths(Number(e.target.value))}
              >
                {VALIDITY_OPTIONS.map((opt) => (
                  <option key={opt.months} value={opt.months}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <TextArea
            label={
              decisionTarget?.status === 'rechazado'
                ? 'Motivo (recomendado)'
                : 'Comentario (opcional)'
            }
            name="decisionComment"
            value={decisionComment}
            onChange={(e) => setDecisionComment(e.target.value)}
          />

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDecisionTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant={decisionTarget?.status === 'aprobado' ? 'success' : 'danger'}
              onClick={confirmDecision}
              isLoading={decisionMutation.isPending}
            >
              {decisionTarget?.status === 'aprobado' ? 'Aprobar' : 'Rechazar'}
            </Button>
          </div>
        </div>
      </Modal>

      <PdfViewerModal
        open={preview.state.open}
        title={preview.state.title}
        url={preview.state.url}
        loading={preview.state.loading}
        onClose={preview.close}
        onDownload={preview.download}
      />
    </>
  );
}
