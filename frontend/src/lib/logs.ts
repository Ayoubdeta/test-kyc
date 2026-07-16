import type { LogAction } from '../types';

// Etiquetas legibles y estilo por tipo de acción del log de auditoría.
// Centralizado para no repetir textos/colores por los componentes.

export const LOG_ACTION_LABELS: Record<LogAction, string> = {
  'auth.login': 'Inicio de sesión',
  'auth.login_failed': 'Inicio de sesión fallido',
  'auth.logout': 'Cierre de sesión',
  'auth.activate': 'Activación de cuenta',
  'client.created': 'Alta de cliente',
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
  'auth.login': 'bg-slate-100 text-slate-600',
  'auth.login_failed': 'bg-red-100 text-red-700',
  'auth.logout': 'bg-slate-100 text-slate-600',
  'auth.activate': 'bg-brand-100 text-brand-700',
  'client.created': 'bg-brand-100 text-brand-700',
  'user.updated': 'bg-blue-100 text-blue-700',
  'user.deleted': 'bg-red-100 text-red-700',
  'user.password_reset': 'bg-amber-100 text-amber-700',
  'document.uploaded': 'bg-slate-100 text-slate-600',
  'document.review_started': 'bg-blue-100 text-blue-700',
  'document.sent_to_approval': 'bg-indigo-100 text-indigo-700',
  'document.cancelled': 'bg-red-100 text-red-700',
  'document.approved': 'bg-green-100 text-green-700',
  'document.rejected': 'bg-red-100 text-red-700',
};

// Orden de las acciones en el desplegable de filtro (agrupadas por dominio).
export const LOG_ACTION_ORDER: LogAction[] = [
  'auth.login',
  'auth.login_failed',
  'auth.logout',
  'auth.activate',
  'client.created',
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
