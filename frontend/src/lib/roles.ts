import type { DocumentStatus, Role } from '../types';

// Etiquetas y estilos centralizados para roles y estados (evita textos y
// colores repetidos por los componentes).

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  cliente: 'Cliente',
  compliance: 'Compliance',
  direccion: 'Dirección General',
};

export const ROLE_BADGE_CLASSES: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700',
  cliente: 'bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400',
  compliance: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
  direccion: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400',
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  pendiente: 'Pendiente de revisión',
  en_revision: 'En revisión',
  pendiente_aprobacion: 'Pendiente de aprobación',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  caducado: 'Caducado',
};

export const STATUS_BADGE_CLASSES: Record<DocumentStatus, string> = {
  pendiente: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  en_revision: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  pendiente_aprobacion: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400',
  aprobado: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
  rechazado: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
  caducado: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
};

// Color (hex) por estado, para gráficas SVG (no admiten clases de Tailwind).
export const STATUS_HEX: Record<DocumentStatus, string> = {
  pendiente: '#94a3b8',
  en_revision: '#3b82f6',
  pendiente_aprobacion: '#6366f1',
  aprobado: '#22c55e',
  rechazado: '#ef4444',
  caducado: '#f59e0b',
};

// Orden canónico de los estados (para selects, gráficas y tablas de KPIs/informes).
export const STATUS_ORDER: DocumentStatus[] = [
  'pendiente',
  'en_revision',
  'pendiente_aprobacion',
  'aprobado',
  'rechazado',
  'caducado',
];

export const ALL_ROLES: Role[] = ['cliente', 'compliance', 'direccion', 'admin'];

/** Personal interno: puede ver todos los documentos de clientes. */
export function isStaff(role: Role | undefined): boolean {
  return role === 'admin' || role === 'compliance' || role === 'direccion';
}

/** Roles que revisan (pendiente → en revisión): admin y compliance. */
export function canReview(role: Role | undefined): boolean {
  return role === 'admin' || role === 'compliance';
}

/** Rol que decide (aprobar/rechazar): solo Dirección General. */
export function canApprove(role: Role | undefined): boolean {
  return role === 'direccion';
}
