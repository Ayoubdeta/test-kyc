import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { getApiErrorMessage } from '../api/client';
import { documentsApi } from '../api/documents.api';
import { formatDate } from '../lib/format';
import type { DocumentItem, DocumentTypeKey } from '../types';
import { StatusBadge } from './Badge';
import { DocTypeIcon, RefreshIcon } from './icons';

const MINE_KEY = ['documents', 'mine'] as const;

// Tono visual de cada nodo de la línea de tiempo.
type NodeTone = 'done' | 'current' | 'ok' | 'warn' | 'error' | 'pending';

interface TimelineStep {
  label: string;
  tone: NodeTone;
  date?: string | null;
}

// A partir del estado del documento (y sus fechas) construye las 4 fases del
// flujo KYC con el tono que le corresponde a cada una. Si el documento aún no
// se ha subido, todas las fases quedan pendientes.
function buildSteps(doc?: DocumentItem): TimelineStep[] {
  if (!doc) {
    return [
      { label: 'Subido', tone: 'pending' },
      { label: 'En revisión', tone: 'pending' },
      { label: 'Pendiente de aprobación', tone: 'pending' },
      { label: 'Resultado', tone: 'pending' },
    ];
  }

  const s = doc.status;
  const decided = Boolean(doc.decidedAt);
  const reachedReview =
    s === 'en_revision' ||
    s === 'pendiente_aprobacion' ||
    s === 'aprobado' ||
    s === 'caducado' ||
    s === 'rechazado';

  // Fase 1: Subido (siempre completada si el documento existe).
  const subido: TimelineStep = { label: 'Subido', tone: 'done', date: doc.uploadedAt };

  // Fase 2: En revisión.
  let revTone: NodeTone = 'pending';
  if (s === 'en_revision') revTone = 'current';
  else if (reachedReview) revTone = 'done';
  const enRevision: TimelineStep = {
    label: 'En revisión',
    tone: revTone,
    date: revTone !== 'pending' ? doc.reviewedAt : null,
  };

  // Fase 3: Pendiente de aprobación (Dirección).
  let apTone: NodeTone = 'pending';
  if (s === 'pendiente_aprobacion') apTone = 'current';
  else if (s === 'aprobado' || s === 'caducado') apTone = 'done';
  else if (s === 'rechazado') apTone = decided ? 'done' : 'pending';
  const pendienteAprobacion: TimelineStep = {
    label: 'Pendiente de aprobación',
    tone: apTone,
    date: apTone === 'done' || apTone === 'current' ? doc.reviewedAt : null,
  };

  // Fase 4: Resultado final.
  let resTone: NodeTone = 'pending';
  let resLabel = 'Aprobado';
  let resDate: string | null = null;
  if (s === 'aprobado') {
    resTone = 'ok';
    resLabel = 'Aprobado';
    resDate = doc.decidedAt;
  } else if (s === 'caducado') {
    resTone = 'warn';
    resLabel = 'Caducado';
    resDate = doc.expiresAt;
  } else if (s === 'rechazado') {
    resTone = 'error';
    resLabel = 'Rechazado';
    resDate = doc.decidedAt ?? doc.reviewedAt;
  }
  const resultado: TimelineStep = { label: resLabel, tone: resTone, date: resDate };

  return [subido, enRevision, pendienteAprobacion, resultado];
}

// Un nodo cuenta como "superado" (deja el conector coloreado hacia el siguiente)
// cuando ya está resuelto: completado o terminal.
const PASSED: NodeTone[] = ['done', 'ok', 'warn', 'error'];

const DOT_CLASSES: Record<NodeTone, string> = {
  done: 'bg-brand-500 text-white',
  current: 'bg-blue-500 text-white ring-4 ring-blue-100',
  ok: 'bg-green-500 text-white',
  warn: 'bg-amber-500 text-white',
  error: 'bg-red-500 text-white',
  pending: 'border border-slate-300 bg-white text-transparent',
};

const DOT_ICON: Record<NodeTone, string> = {
  done: '✓',
  current: '•',
  ok: '✓',
  warn: '!',
  error: '✕',
  pending: '•',
};

function StepDot({ tone }: { tone: NodeTone }) {
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${DOT_CLASSES[tone]}`}
      aria-hidden="true"
    >
      {DOT_ICON[tone]}
    </span>
  );
}

interface Props {
  docType: DocumentTypeKey;
  label: string;
  doc?: DocumentItem;
}

// Tarjeta con la línea de tiempo (stepper horizontal) del ciclo de vida de un
// documento KYC para el cliente.
export function DocumentTimeline({ docType, label, doc }: Props) {
  const steps = buildSteps(doc);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Reenvío del documento (cuando fue rechazado): sustituye el fichero por tipo.
  const upload = useMutation({
    mutationFn: (file: File) => documentsApi.upload(docType, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MINE_KEY }),
    onError: (err) => setUploadError(getApiErrorMessage(err, 'No se pudo subir el documento')),
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadError(null);
      upload.mutate(file);
    }
    e.target.value = '';
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <DocTypeIcon docType={docType} className="h-5 w-5 shrink-0 text-slate-400" />
          <span className="truncate text-sm font-medium text-slate-800">{label}</span>
        </div>
        {doc ? (
          <StatusBadge status={doc.status} />
        ) : (
          <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
            No subido
          </span>
        )}
      </div>

      {/* Línea de tiempo: nodos con conectores intermedios. */}
      <div className="flex items-start overflow-x-auto pb-1">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-1 items-start">
            {i > 0 && (
              <div
                className={`mt-3.5 h-0.5 flex-1 ${
                  PASSED.includes(steps[i - 1].tone) ? 'bg-brand-300' : 'bg-slate-200'
                }`}
              />
            )}
            <div className="flex w-16 shrink-0 flex-col items-center text-center">
              <StepDot tone={step.tone} />
              <span className="mt-1.5 text-[10px] font-medium leading-tight text-slate-600">
                {step.label}
              </span>
              {step.date && (
                <span className="mt-0.5 text-[9px] leading-tight text-slate-400">
                  {formatDate(step.date)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Rechazado: motivo + botón para reenviar un documento correcto. */}
      {doc?.status === 'rechazado' && (
        <div className="mt-2 flex flex-col gap-2">
          {doc.reviewComment && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              Motivo: {doc.reviewComment}
            </p>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
            className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            <RefreshIcon className="h-3.5 w-3.5" />
            {upload.isPending ? 'Subiendo…' : 'Reenviar documento'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onFileChange}
          />
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
        </div>
      )}
    </div>
  );
}
