import type { LogAction } from '../types';

// Etiquetas legibles y estilo por tipo de acción del log de auditoría.
// Centralizado para no repetir textos/colores por los componentes.

export const LOG_ACTION_LABELS: Record<LogAction, string> = {
  'auth.login': 'Inicio de sesión',
  'auth.login_failed': 'Inicio de sesión fallido',
  'auth.logout': 'Cierre de sesión',
  'auth.activate': 'Activación de cuenta',
  'client.created': 'Alta de cliente',
  'staff.created': 'Alta de usuario interno',
  'user.updated': 'Edición de usuario',
  'user.deleted': 'Eliminación de usuario',
  'user.password_reset': 'Restablecer contraseña',
  'document.uploaded': 'Documento subido',
  'document.review_started': 'Documento en revisión',
  'document.sent_to_approval': 'Enviado a aprobación',
  'document.cancelled': 'Documento cancelado',
  'document.approved': 'Documento aprobado',
  'document.rejected': 'Documento rechazado',
};

// Color del "chip" según el carácter de la acción (info / éxito / peligro).
export const LOG_ACTION_BADGE: Record<LogAction, string> = {
  'auth.login': 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  'auth.login_failed': 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
  'auth.logout': 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  'auth.activate': 'bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400',
  'client.created': 'bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400',
  'staff.created': 'bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400',
  'user.updated': 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  'user.deleted': 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
  'user.password_reset': 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
  'document.uploaded': 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  'document.review_started': 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  'document.sent_to_approval': 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400',
  'document.cancelled': 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
  'document.approved': 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
  'document.rejected': 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
};

// Orden de las acciones en el desplegable de filtro (agrupadas por dominio).
export const LOG_ACTION_ORDER: LogAction[] = [
  'auth.login',
  'auth.login_failed',
  'auth.logout',
  'auth.activate',
  'client.created',
  'staff.created',
  'user.updated',
  'user.password_reset',
  'user.deleted',
  'document.uploaded',
  'document.review_started',
  'document.sent_to_approval',
  'document.cancelled',
  'document.approved',
  'document.rejected',
];
