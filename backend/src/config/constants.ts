// Constantes centralizadas: evitamos "magic numbers" y strings repetidos
// dispersos por el código. Un único lugar donde cambiarlos.

// Roles del sistema.
export const ROLES = {
  ADMIN: 'admin',
  CLIENTE: 'cliente',
  COMPLIANCE: 'compliance',
  // Dirección General: única autoridad que aprueba o rechaza documentos.
  DIRECCION: 'direccion',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = [
  ROLES.ADMIN,
  ROLES.CLIENTE,
  ROLES.COMPLIANCE,
  ROLES.DIRECCION,
];

// Personal interno: puede ver y descargar todos los documentos de clientes.
export const STAFF_ROLES: Role[] = [ROLES.ADMIN, ROLES.COMPLIANCE, ROLES.DIRECCION];

// Roles que REVISAN (pendiente → en revisión → pendiente de aprobación). El
// admin revisa como compliance pero NO aprueba.
export const REVIEW_ROLES: Role[] = [ROLES.ADMIN, ROLES.COMPLIANCE];

// Emisor de un mensaje de chat: el cliente o el personal interno.
export const CHAT_SENDER = {
  CLIENT: 'cliente',
  STAFF: 'staff',
} as const;

export type ChatSender = (typeof CHAT_SENDER)[keyof typeof CHAT_SENDER];

// Rol que DECIDE (en revisión → aprobado/rechazado): solo Dirección General.
export const APPROVAL_ROLES: Role[] = [ROLES.DIRECCION];

// Estados de revisión almacenados de un documento. El flujo es:
//   pendiente
//     → en_revision            (compliance/admin lo abre para revisarlo)
//       → pendiente_aprobacion (compliance/admin lo envía a Dirección)
//         → aprobado | rechazado (Dirección decide)
//       → rechazado            (compliance/admin cancela; el cliente reenvía)
export const DOCUMENT_STATUS = {
  PENDING: 'pendiente',
  IN_REVIEW: 'en_revision',
  PENDING_APPROVAL: 'pendiente_aprobacion',
  APPROVED: 'aprobado',
  REJECTED: 'rechazado',
} as const;

export type StoredDocumentStatus =
  (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

// "caducado" es un estado DERIVADO (aprobado + fecha de validez superada).
export type DocumentStatus = StoredDocumentStatus | 'caducado';

// Tipo de cliente del expediente. (Fase 1: el asistente es el de "empresa".)
export const CLIENT_TYPE = {
  EMPRESA: 'empresa',
  AUTONOMO: 'autonomo',
  PARTICULAR: 'particular',
} as const;

export type ClientType = (typeof CLIENT_TYPE)[keyof typeof CLIENT_TYPE];

// Estado del expediente del cliente a lo largo del onboarding.
export const EXPEDIENTE_STATUS = {
  PENDING_COMPLETION: 'pendiente_completar',
  SUBMITTED: 'enviado',
  IN_REVIEW: 'en_revision',
  APPROVED: 'aprobado',
  REJECTED: 'rechazado',
  ACTIVE: 'activo',
} as const;

// Días de validez del enlace de activación de la cuenta del cliente.
export const ACTIVATION_TTL_DAYS = 7;

// Tipo MIME admitido para los documentos.
export const ALLOWED_DOCUMENT_MIME = 'application/pdf';

// Tipos MIME admitidos como adjunto en el chat (PDF + imágenes comunes).
export const ALLOWED_CHAT_MIMES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

// Longitud máxima del cuerpo de un mensaje de chat.
export const CHAT_MESSAGE_MAX = 2000;

// ─── Tipos de documento KYC obligatorios (7) ───────────────────
export const DOCUMENT_TYPES = [
  { key: 'dni_representante', label: 'DNI / NIE o Pasaporte del representante', emoji: '🪪' },
  { key: 'cif_empresa', label: 'CIF / NIF de la empresa', emoji: '🏢' },
  { key: 'escritura_constitucion', label: 'Escritura de constitución', emoji: '📑' },
  { key: 'poderes_representante', label: 'Poderes del representante', emoji: '👤' },
  { key: 'certificado_titularidad_bancaria', label: 'Certificado de titularidad bancaria', emoji: '🏦' },
  { key: 'declaracion_titularidad_real', label: 'Declaración de titularidad real', emoji: '📋' },
  { key: 'contrato_decal', label: 'Contrato firmado con Decal', emoji: '📄' },
] as const;

export type DocumentTypeKey = (typeof DOCUMENT_TYPES)[number]['key'];

export const DOCUMENT_TYPE_KEYS: DocumentTypeKey[] = DOCUMENT_TYPES.map((t) => t.key);

// ─── Tipos de notificación ─────────────────────────────────────
export const NOTIFICATION_TYPE = {
  DOC_APPROVED: 'documento_aprobado',
  DOC_REJECTED: 'documento_rechazado',
  DOC_EXPIRED: 'documento_caducado',
  DOC_EXPIRING: 'documento_por_caducar',
  // Para Dirección General: hay un documento revisado esperando su decisión.
  DOC_PENDING_APPROVAL: 'documento_para_aprobar',
  // Para compliance/admin: un cliente ha subido documentación a revisar.
  DOC_UPLOADED: 'documento_subido',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

// Días de antelación con los que se avisa antes de que un documento caduque.
export const EXPIRY_WARNING_DAYS = 15;

// ─── Eventos del historial de documentos (auditoría) ───────────
// Registro inmutable e independiente de las notificaciones (que el usuario
// puede borrar): así el historial de un documento nunca se pierde aunque el
// documento se reemplace o se eliminen sus notificaciones.
export const DOCUMENT_EVENT = {
  UPLOADED: 'subido',
  REVIEWED: 'revisado',
  APPROVED: 'aprobado',
  REJECTED: 'rechazado',
  EXPIRED: 'caducado',
} as const;

export type DocumentEventType =
  (typeof DOCUMENT_EVENT)[keyof typeof DOCUMENT_EVENT];

// ─── Log de actividad (auditoría global, solo admin) ───────────
// Acciones que registramos de forma transversal en toda la plataforma.
// Namespaced por dominio (auth / client / user / document) para poder
// filtrar y agrupar con comodidad.
export const LOG_ACTION = {
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGIN_FAILED: 'auth.login_failed',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_ACTIVATE: 'auth.activate',
  CLIENT_CREATED: 'client.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_PASSWORD_RESET: 'user.password_reset',
  DOC_UPLOADED: 'document.uploaded',
  DOC_REVIEW_STARTED: 'document.review_started',
  DOC_SENT_APPROVAL: 'document.sent_to_approval',
  DOC_CANCELLED: 'document.cancelled',
  DOC_APPROVED: 'document.approved',
  DOC_REJECTED: 'document.rejected',
} as const;

export type LogAction = (typeof LOG_ACTION)[keyof typeof LOG_ACTION];

// Tipo de entidad afectada por una acción del log (para el filtro y el enlace).
export const LOG_ENTITY = {
  USER: 'user',
  DOCUMENT: 'document',
  AUTH: 'auth',
} as const;

export type LogEntity = (typeof LOG_ENTITY)[keyof typeof LOG_ENTITY];

// Límites de validez que puede fijar el revisor al aprobar (en meses).
export const MIN_VALIDITY_MONTHS = 1;
export const MAX_VALIDITY_MONTHS = 120;

// Nombres de las cookies de sesión.
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

// La cookie del refresh token solo se envía a las rutas de auth que la
// necesitan (renovar / cerrar sesión). Reduce su exposición.
export const REFRESH_COOKIE_PATH = '/api/auth';

// Milisegundos por día, para calcular expiraciones legibles.
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Límites de rate limiting.
export const RATE_LIMIT = {
  // Ventana general de la API.
  WINDOW_MS: 15 * 60 * 1000, // 15 minutos
  MAX_REQUESTS: 300,
  // Ventana más estricta para endpoints de autenticación (anti fuerza bruta).
  AUTH_WINDOW_MS: 15 * 60 * 1000,
  AUTH_MAX_REQUESTS: 20,
} as const;
