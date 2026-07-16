import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { documentsApi } from '../api/documents.api';
import { EventIcon, FolderIcon } from '../components/icons';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { EVENT_META, documentTypeLabel } from '../lib/documents';
import { formatDate, formatDateTime } from '../lib/format';
import type { DocumentEventType } from '../types';

const HISTORY_KEY = ['documents', 'history'] as const;

// Filtros de la barra superior. El valor vacío significa "Todos".
const FILTERS: { key: '' | DocumentEventType; label: string }[] = [
  { key: '', label: 'Todos' },
  { key: 'subido', label: 'Subidos' },
  { key: 'revisado', label: 'En revisión' },
  { key: 'aprobado', label: 'Aprobados' },
  { key: 'rechazado', label: 'Rechazados' },
  { key: 'caducado', label: 'Caducados' },
];

export function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const active = params.get('estado') ?? '';

  const { data: events = [], isLoading } = useQuery({
    queryKey: HISTORY_KEY,
    queryFn: documentsApi.history,
  });

  const filtered = active ? events.filter((e) => e.eventType === active) : events;

  const setFilter = (key: string) => {
    setParams(key ? { estado: key } : {}, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Historial de documentos</h1>
        <p className="text-sm text-slate-500">
          Registro de tus documentos: cuándo los subiste y cuándo fueron aprobados, rechazados o
          caducaron.
        </p>
      </div>

      {/* Filtros por estado */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const isActive = active === f.key;
          return (
            <button
              key={f.key || 'todos'}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-card">
          <FolderIcon className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            {active
              ? 'No hay documentos con este estado.'
              : 'Todavía no hay actividad. Sube tus documentos para empezar.'}
          </p>
        </div>
      ) : (
        <ol className="relative flex flex-col gap-4 border-l border-slate-200 pl-6">
          {filtered.map((ev) => {
            const meta = EVENT_META[ev.eventType];
            return (
              <li key={ev.id} className="relative animate-fade-in-up">
                {/* Punto del timeline */}
                <span
                  className={`absolute -left-[1.9rem] top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${meta.dot}`}
                  aria-hidden="true"
                />
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <EventIcon type={ev.eventType} className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-semibold text-slate-800">{meta.label}</span>
                      <span className="text-sm text-slate-500">
                        · {documentTypeLabel(ev.docType)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">{formatDateTime(ev.createdAt)}</span>
                  </div>

                  {/* Detalle según el tipo de evento */}
                  {ev.eventType === 'aprobado' && ev.expiresAt && (
                    <p className="mt-1.5 text-xs text-green-700">
                      Válido hasta el {formatDate(ev.expiresAt)}
                    </p>
                  )}
                  {ev.eventType === 'rechazado' && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {ev.comment ? `Motivo: ${ev.comment}` : 'Sin motivo indicado'}
                    </p>
                  )}
                  {ev.originalName && (
                    <p className="mt-1 text-xs text-slate-400">{ev.originalName}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </DashboardLayout>
  );
}
