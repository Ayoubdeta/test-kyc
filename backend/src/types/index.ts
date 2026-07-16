// Tipos compartidos del dominio. Reflejan las filas de la base de datos y
// las formas que viajan por la API.

import type {
  ChatSender,
  DocumentEventType,
  DocumentStatus,
  DocumentTypeKey,
  Language,
  LogAction,
  NotificationType,
  Role,
  StoredDocumentStatus,
} from '../config/constants';

export interface UserRow {
  id: string;
  username: string;
  email: string;
  // Puede ser null mientras la cuenta del cliente no se haya activado.
  password_hash: string | null;
  role: Role;
  last_login_at: Date | null;
  activation_token_hash: string | null;
  activation_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** Contexto mínimo para validar un token de activación. */
export interface ActivationContext {
  id: string;
  email: string;
  razon_social: string;
}

export interface ProfileRow {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  birth_date: Date | null;
  bio: string | null;
  avatar_url: string | null;
  language: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

export interface DocumentRow {
  id: string;
  user_id: string;
  doc_type: DocumentTypeKey | null;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size_bytes: string; // BIGINT llega como string desde pg
  status: StoredDocumentStatus;
  review_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  decided_by: string | null;
  decided_at: Date | null;
  expires_at: Date | null;
  uploaded_at: Date;
}

/** Fila de documento enriquecida con datos del propietario (para admin/compliance). */
export interface DocumentWithOwnerRow extends DocumentRow {
  owner_username: string;
  owner_email: string;
  owner_full_name: string | null;
}

/** Datos públicos del usuario que se devuelven al cliente (sin el hash). */
export interface PublicUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  lastLoginAt: string | null;
  createdAt: string;
}

/** Documento tal y como se expone al cliente. */
export interface PublicDocument {
  id: string;
  docType: DocumentTypeKey | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  /** Estado efectivo (incluye "caducado" si aprobado y vencido). */
  status: DocumentStatus;
  reviewComment: string | null;
  reviewedAt: string | null;
  decidedAt: string | null;
  expiresAt: string | null;
  uploadedAt: string;
  owner?: {
    id: string;
    username: string;
    email: string;
    fullName: string | null;
  };
}

/** Evento de auditoría del historial de un documento. */
export interface DocumentEventRow {
  id: string;
  user_id: string;
  document_id: string | null;
  doc_type: DocumentTypeKey | null;
  original_name: string | null;
  event_type: DocumentEventType;
  comment: string | null;
  expires_at: Date | null;
  actor_id: string | null;
  created_at: Date;
}

export interface PublicDocumentEvent {
  id: string;
  docType: DocumentTypeKey | null;
  originalName: string | null;
  eventType: DocumentEventType;
  comment: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  document_id: string | null;
  read_at: Date | null;
  created_at: Date;
}

export interface PublicNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  documentId: string | null;
  read: boolean;
  createdAt: string;
}

// ─── Chat ──────────────────────────────────────────────────────
export interface ChatMessageRow {
  id: string;
  client_id: string;
  sender_id: string;
  sender_role: ChatSender;
  body: string;
  read_at: Date | null;
  created_at: string | Date;
  reply_to_id: string | null;
  edited_at: Date | null;
  deleted_at: Date | null;
  attachment_name: string | null;
  attachment_stored: string | null;
  attachment_mime: string | null;
  attachment_size: string | null; // BIGINT llega como string
  reactions: Record<string, string[]> | null;
}

/** Fila enriquecida con el nombre/avatar del emisor y una vista del mensaje citado. */
export interface ChatMessageWithMetaRow extends ChatMessageRow {
  sender_name: string | null;
  sender_avatar_url: string | null;
  reply_body: string | null;
  reply_sender_role: ChatSender | null;
  reply_deleted_at: Date | null;
}

export interface ChatAttachment {
  name: string;
  mime: string;
  size: number;
  /** Es una imagen mostrable inline (vs. adjunto genérico como PDF). */
  isImage: boolean;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface ChatReplyPreview {
  id: string;
  senderRole: ChatSender;
  snippet: string;
}

export interface PublicChatMessage {
  id: string;
  senderRole: ChatSender;
  senderId: string;
  senderName: string | null;
  senderAvatarUrl: string | null;
  body: string;
  read: boolean;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  mine?: boolean;
  attachment: ChatAttachment | null;
  replyTo: ChatReplyPreview | null;
  reactions: ChatReaction[];
}

/** Resumen de conversación para la bandeja del personal. */
export interface ChatConversationRow {
  client_id: string;
  name: string;
  email: string;
  last_body: string;
  last_at: Date;
  unread: number;
}

export interface PublicChatConversation {
  clientId: string;
  name: string;
  email: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

/** Perfil tal y como se expone al cliente. */
export interface PublicProfile {
  fullName: string | null;
  phone: string | null;
  address: string | null;
  birthDate: string | null;
  bio: string | null;
  avatarUrl: string | null;
  language: Language;
}

/** Respuesta combinada usuario + perfil para el dashboard. */
export interface MeResponse {
  user: PublicUser;
  profile: PublicProfile;
}

/** Contenido (claims) que firmamos dentro del access token. */
export interface AccessTokenPayload {
  sub: string; // id del usuario
  username: string;
  email: string;
  role: Role;
}

// ─── Log de actividad (auditoría global) ───────────────────────
export interface ActivityLogRow {
  id: string; // BIGSERIAL llega como string desde pg
  actor_id: string | null;
  actor_role: Role | null;
  actor_label: string | null;
  action: LogAction;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  created_at: Date;
}

export interface PublicActivityLog {
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

// ─── Informes (detalle de documentos, para el personal interno) ─
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
