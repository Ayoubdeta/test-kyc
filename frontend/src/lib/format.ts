// Helpers de formato para la UI. Centralizados para no repetir lógica de
// presentación por los componentes.

const PLACEHOLDER = '—';

/** Muestra un valor o un guion si está vacío. */
export function displayValue(value: string | null | undefined): string {
  return value && value.trim() !== '' ? value : PLACEHOLDER;
}

/** Formatea una fecha ISO a un formato legible en español. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return PLACEHOLDER;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
  }).format(date);
}

/** Formatea un tamaño en bytes a KB/MB legibles. */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

/** Formatea una fecha ISO con hora. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return PLACEHOLDER;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
