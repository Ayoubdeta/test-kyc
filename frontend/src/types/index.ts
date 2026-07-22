// Tipos que reflejan las respuestas de la API (deben coincidir con las formas
// públicas del backend).

export type Role = 'admin' | 'cliente' | 'compliance' | 'direccion';

export type DocumentStatus =
  | 'pendiente'
  | 'en_revision'
  | 'pendiente_aprobacion'
  | 'aprobado'
  | 'rechazado'
  | 'caducado';

export type DocumentTypeKey =
  | 'dni_representante'
  | 'cif_empresa'
  | 'escritura_constitucion'
  | 'poderes_representante'
  | 'certificado_titularidad_bancaria'
  | 'declaracion_titularidad_real'
  | 'contrato_decal';

export type NotificationType =
  | 'documento_aprobado'
  | 'documento_rechazado'
  | 'documento_caducado'
  | 'documento_por_caducar'
  | 'documento_para_aprobar'
  | 'documento_subido';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  documentId: string | null;
  read: boolean;
  createdAt: string;
}

export type DocumentEventType =
  | 'subido'
  | 'revisado'
  | 'aprobado'
  | 'rechazado'
  | 'caducado';

export interface DocumentEventItem {
  id: string;
  docType: DocumentTypeKey | null;
  originalName: string | null;
  eventType: DocumentEventType;
  comment: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  docType: DocumentTypeKey | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  reviewComment: string | null;
  reviewedAt: string | null;
  decidedAt: string | null;
  expiresAt: string | null;
  /** Validez (meses) propuesta al enviar a aprobación; Dirección puede ajustarla. */
  validityMonths: number | null;
  uploadedAt: string;
  owner?: {
    id: string;
    username: string;
    email: string;
    fullName: string | null;
  };
}

export interface PublicProfile {
  fullName: string | null;
  phone: string | null;
  address: string | null;
  birthDate: string | null;
  bio: string | null;
  avatarUrl: string | null;
  language: string;
  theme: string;
}

export interface MeResponse {
  user: PublicUser;
  profile: PublicProfile;
}

export interface AuthResponse {
  user: PublicUser;
}

// ─── Estadísticas / KPIs ───────────────────────────────────────
export interface StatsOverview {
  year: number;
  totals: {
    enviadosEsteAno: number;
    pendientes: number;
    enRevision: number;
    pendienteAprobacion: number;
    aprobados: number;
    caducados: number;
    rechazados: number;
    total: number;
  };
  monthly: { month: number; label: string; uploaded: number }[];
}

export interface StatsFilters {
  from?: string;
  to?: string;
  docType?: DocumentTypeKey;
  status?: DocumentStatus;
}

export interface StatsResult {
  filters: StatsFilters;
  total: number;
  byStatus: { status: DocumentStatus; count: number }[];
  byType: { docType: string; count: number; label: string }[];
  byMonth: { month: string; uploaded: number }[];
  byUser: {
    userId: string;
    name: string;
    email: string;
    total: number;
    pendiente: number;
    en_revision: number;
    pendiente_aprobacion: number;
    aprobado: number;
    caducado: number;
    rechazado: number;
  }[];
}

// ─── Chat ───────────────────────────────────────────────────────
export type ChatSenderRole = 'cliente' | 'staff';

export interface ChatAttachment {
  name: string;
  mime: string;
  size: number;
  isImage: boolean;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface ChatReplyPreview {
  id: string;
  senderRole: ChatSenderRole;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  senderRole: ChatSenderRole;
  senderId: string;
  senderName: string | null;
  senderAvatarUrl: string | null;
  body: string;
  read: boolean;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  mine: boolean;
  attachment: ChatAttachment | null;
  replyTo: ChatReplyPreview | null;
  reactions: ChatReaction[];
}

/** Evento recibido por SSE (señal de cambio; el detalle se recarga). */
export type ChatStreamEvent =
  | { type: 'message' | 'updated'; clientId: string }
  | { type: 'read'; clientId: string; reader: ChatSenderRole }
  | { type: 'typing'; clientId: string; senderRole: ChatSenderRole; senderName: string | null };

export interface ChatConversation {
  clientId: string;
  name: string;
  email: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

// ─── Informes (detalle de documentos, personal interno) ────────
export interface ReportRow {
  documentId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  docType: DocumentTypeKey | null;
  docLabel: string;
  originalName: string;
  status: DocumentStatus;
  uploadedAt: string;
  reviewedAt: string | null;
  reviewerName: string | null;
  decidedAt: string | null;
  deciderName: string | null;
  expiresAt: string | null;
  comment: string | null;
}

export interface ReportFilters {
  from?: string;
  to?: string;
  docType?: DocumentTypeKey;
  status?: DocumentStatus;
  clientId?: string;
  search?: string;
}

export interface ReportResult {
  filters: ReportFilters;
  rows: ReportRow[];
  total: number;
  truncated: boolean;
  limit: number;
  summary: {
    byStatus: Partial<Record<DocumentStatus, number>>;
    rechazados: number;
    aprobados: number;
  };
}

// ─── Log de actividad (auditoría global, solo admin) ───────────
export type LogAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'auth.activate'
  | 'client.created'
  | 'staff.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.password_reset'
  | 'document.uploaded'
  | 'document.review_started'
  | 'document.sent_to_approval'
  | 'document.cancelled'
  | 'document.approved'
  | 'document.rejected';

export interface ActivityLog {
  id: string;
  actorId: string | null;
  actorRole: Role | null;
  actorLabel: string | null;
  action: LogAction;
  entityType: string | null;
  entityId: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

export interface LogFilters {
  from?: string;
  to?: string;
  action?: LogAction;
  actorId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface LogsResult {
  logs: ActivityLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Error de campo devuelto por el backend en validaciones. */
export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  error: string;
  details?: FieldError[];
}
