import {
  CHAT_SENDER,
  DEFAULT_LANGUAGE,
  DOCUMENT_STATUS,
  DOCUMENT_TYPES,
  SUPPORTED_LANGUAGES,
  type ChatSender,
  type DocumentStatus,
  type DocumentTypeKey,
  type Language,
} from '../config/constants';
import type {
  ActivityLogRow,
  ChatAttachment,
  ChatConversationRow,
  ChatMessageWithMetaRow,
  ChatReaction,
  ChatReplyPreview,
  DocumentEventRow,
  DocumentRow,
  DocumentWithOwnerRow,
  NotificationRow,
  ProfileRow,
  PublicActivityLog,
  PublicChatConversation,
  PublicChatMessage,
  PublicDocument,
  PublicDocumentEvent,
  PublicNotification,
  PublicProfile,
  PublicUser,
  UserRow,
} from '../types';

/** Etiqueta legible del tipo de documento KYC (o "Documento" si no se conoce). */
export function docTypeLabel(docType: DocumentTypeKey | null): string {
  return DOCUMENT_TYPES.find((t) => t.key === docType)?.label ?? 'Documento';
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

// Transforma las filas de la base de datos (snake_case, con campos sensibles)
// en las formas públicas que viajan al cliente (camelCase, sin password_hash).
// Centralizar esto evita filtrar accidentalmente el hash de la contraseña.

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

/** Calcula el estado efectivo: "caducado" si está aprobado y ya venció. */
export function effectiveStatus(row: DocumentRow): DocumentStatus {
  if (
    row.status === DOCUMENT_STATUS.APPROVED &&
    row.expires_at &&
    row.expires_at.getTime() < Date.now()
  ) {
    return 'caducado';
  }
  return row.status;
}

export function toPublicDocument(
  row: DocumentRow | DocumentWithOwnerRow,
  includeOwner = false,
): PublicDocument {
  const base: PublicDocument = {
    id: row.id,
    docType: row.doc_type,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    status: effectiveStatus(row),
    reviewComment: row.review_comment,
    reviewedAt: row.reviewed_at ? row.reviewed_at.toISOString() : null,
    decidedAt: row.decided_at ? row.decided_at.toISOString() : null,
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    validityMonths: row.validity_months,
    uploadedAt: row.uploaded_at.toISOString(),
  };

  if (includeOwner && 'owner_username' in row) {
    base.owner = {
      id: row.user_id,
      username: row.owner_username,
      email: row.owner_email,
      fullName: row.owner_full_name,
    };
  }

  return base;
}

export function toPublicNotification(row: NotificationRow): PublicNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    documentId: row.document_id,
    read: row.read_at !== null,
    createdAt: row.created_at.toISOString(),
  };
}

export function toPublicDocumentEvent(row: DocumentEventRow): PublicDocumentEvent {
  return {
    id: row.id,
    docType: row.doc_type,
    originalName: row.original_name,
    eventType: row.event_type,
    comment: row.comment,
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

// Convierte el mapa de reacciones (emoji → userIds) en una lista con recuento
// y si el espectador ya reaccionó (para pintar el chip activo).
function toReactions(
  reactions: Record<string, string[]> | null,
  viewerUserId: string,
): ChatReaction[] {
  if (!reactions) return [];
  return Object.entries(reactions)
    .filter(([, users]) => users.length > 0)
    .map(([emoji, users]) => ({
      emoji,
      count: users.length,
      mine: users.includes(viewerUserId),
    }));
}

function shorten(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function toPublicChatMessage(
  row: ChatMessageWithMetaRow,
  viewerRole: ChatSender,
  viewerUserId: string,
): PublicChatMessage {
  const deleted = row.deleted_at !== null;

  const attachment: ChatAttachment | null =
    !deleted && row.attachment_stored && row.attachment_name && row.attachment_mime
      ? {
          name: row.attachment_name,
          mime: row.attachment_mime,
          size: Number(row.attachment_size ?? 0),
          isImage: row.attachment_mime.startsWith('image/'),
        }
      : null;

  const replyTo: ChatReplyPreview | null = row.reply_to_id
    ? {
        id: row.reply_to_id,
        senderRole: row.reply_sender_role ?? CHAT_SENDER.STAFF,
        snippet: row.reply_deleted_at
          ? 'Mensaje eliminado'
          : shorten(row.reply_body ?? ''),
      }
    : null;

  return {
    id: row.id,
    senderRole: row.sender_role,
    senderId: row.sender_id,
    // Solo mostramos la identidad del emisor cuando es personal (el cliente
    // ve qué agente le responde). Para mensajes propios del cliente no aplica.
    senderName: row.sender_role === CHAT_SENDER.STAFF ? row.sender_name : null,
    senderAvatarUrl: row.sender_role === CHAT_SENDER.STAFF ? row.sender_avatar_url : null,
    body: deleted ? '' : row.body,
    read: row.read_at !== null,
    createdAt: toIso(row.created_at),
    editedAt: row.edited_at ? toIso(row.edited_at) : null,
    deleted,
    mine: row.sender_role === viewerRole,
    attachment,
    replyTo,
    reactions: deleted ? [] : toReactions(row.reactions, viewerUserId),
  };
}

export function toPublicChatConversation(row: ChatConversationRow): PublicChatConversation {
  return {
    clientId: row.client_id,
    name: row.name,
    email: row.email,
    lastMessage: row.last_body,
    lastAt: toIso(row.last_at),
    unread: row.unread,
  };
}

export function toPublicActivityLog(row: ActivityLogRow): PublicActivityLog {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorRole: row.actor_role,
    actorLabel: row.actor_label,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    description: row.description,
    metadata: row.metadata,
    ip: row.ip,
    createdAt: toIso(row.created_at),
  };
}

export function toPublicProfile(row: ProfileRow | null): PublicProfile {
  return {
    fullName: row?.full_name ?? null,
    phone: row?.phone ?? null,
    address: row?.address ?? null,
    // birth_date es un DATE: lo devolvemos como YYYY-MM-DD.
    birthDate: row?.birth_date ? row.birth_date.toISOString().slice(0, 10) : null,
    bio: row?.bio ?? null,
    avatarUrl: row?.avatar_url ?? null,
    language: toLanguage(row?.language),
  };
}

/** Normaliza el idioma guardado a uno soportado (con fallback al por defecto). */
function toLanguage(value: string | null | undefined): Language {
  return SUPPORTED_LANGUAGES.includes(value as Language) ? (value as Language) : DEFAULT_LANGUAGE;
}
