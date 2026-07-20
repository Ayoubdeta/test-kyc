import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import type { I18nContextValue } from '../i18n';
import { formatDate, formatDateTime } from '../lib/format';
import type { ChatMessage } from '../types';
import { ChatAttachmentView } from './ChatAttachmentView';
import { SearchIcon } from './icons';
import { Alert } from './ui/Alert';

interface SendPayload {
  body: string;
  file: File | null;
  replyToId: string | null;
}

interface Props {
  messages: ChatMessage[];
  onSend: (payload: SendPayload) => void;
  onEdit?: (id: string, body: string) => void;
  onDelete?: (id: string) => void;
  onReact?: (id: string, emoji: string) => void;
  onTyping?: () => void;
  /** Texto a mostrar cuando la otra parte está escribiendo. */
  typingLabel?: string | null;
  isSending?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  emptyText?: string;
}

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🙏', '😮', '😢', '✅'];
const MAX_ATTACH_MB = 10;

// Etiqueta de día para los separadores (Hoy / Ayer / fecha).
function dayLabel(iso: string, t: I18nContextValue['t']): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return t('chat.today');
  if (sameDay(d, yesterday)) return t('chat.yesterday');
  return formatDate(iso);
}

export function ChatThread({
  messages,
  onSend,
  onEdit,
  onDelete,
  onReact,
  onTyping,
  typingLabel,
  isSending = false,
  isLoading = false,
  disabled = false,
  emptyText,
}: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [reactFor, setReactFor] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingRef = useRef(0);

  useEffect(() => {
    if (!search) endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, search]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => !m.deleted && m.body.toLowerCase().includes(q));
  }, [messages, search]);

  const submit = () => {
    const body = draft.trim();
    if ((!body && !file) || isSending) return;
    onSend({ body, file, replyToId: replyTo?.id ?? null });
    setDraft('');
    setFile(null);
    setReplyTo(null);
    setShowEmoji(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    // Señal de "escribiendo…" con throttle de 2s para no saturar.
    const now = Date.now();
    if (onTyping && now - lastTypingRef.current > 2000) {
      lastTypingRef.current = now;
      onTyping();
    }
  };

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_ATTACH_MB * 1024 * 1024) {
      setAttachError(t('chat.attachTooLarge', { mb: MAX_ATTACH_MB }));
      return;
    }
    setAttachError(null);
    setFile(f);
  };

  const startEdit = (m: ChatMessage) => {
    setEditingId(m.id);
    setEditDraft(m.body);
  };
  const saveEdit = () => {
    if (editingId && editDraft.trim() && onEdit) onEdit(editingId, editDraft.trim());
    setEditingId(null);
    setEditDraft('');
  };

  let lastDay = '';

  return (
    <div className="flex h-full flex-col">
      {/* Barra de búsqueda dentro del hilo */}
      <div className="flex items-center justify-end gap-2 border-b border-slate-100 px-2 py-1">
        {showSearch && (
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('chat.searchPlaceholder')}
            className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-brand-500"
          />
        )}
        <button
          type="button"
          onClick={() => {
            setShowSearch((s) => !s);
            setSearch('');
          }}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={t('chat.search')}
        >
          <SearchIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-slate-400">{t('common.loading')}</p>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {search ? t('chat.noResults') : emptyText ?? t('chat.emptyThread')}
          </p>
        ) : (
          visible.map((m) => {
            const showDay = !search && dayLabel(m.createdAt, t) !== lastDay;
            if (showDay) lastDay = dayLabel(m.createdAt, t);
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full bg-slate-100 px-3 py-0.5 text-[11px] font-medium text-slate-500">
                      {lastDay}
                    </span>
                  </div>
                )}

                <div className={`group flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[82%]">
                    <div
                      className={`relative rounded-2xl px-3 py-2 text-sm ${
                        m.mine
                          ? 'rounded-br-sm bg-brand-600 text-white'
                          : 'rounded-bl-sm bg-slate-100 text-slate-800'
                      }`}
                    >
                      {/* Identidad del agente (solo mensajes del personal) */}
                      {!m.mine && m.senderName && (
                        <p className="mb-0.5 text-[11px] font-semibold text-brand-700">
                          {m.senderName}
                        </p>
                      )}

                      {/* Vista del mensaje citado */}
                      {m.replyTo && (
                        <div
                          className={`mb-1 rounded-md border-l-2 px-2 py-1 text-[11px] ${
                            m.mine
                              ? 'border-white/50 bg-white/10 text-white/80'
                              : 'border-brand-400 bg-white/60 text-slate-500'
                          }`}
                        >
                          {m.replyTo.snippet}
                        </div>
                      )}

                      {editingId === m.id ? (
                        <div className="flex flex-col gap-1">
                          <textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            rows={2}
                            className="w-full resize-none rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 outline-none"
                          />
                          <div className="flex justify-end gap-2 text-xs">
                            <button onClick={() => setEditingId(null)} className="text-white/80 hover:underline">
                              {t('common.cancel')}
                            </button>
                            <button onClick={saveEdit} className="font-semibold text-white hover:underline">
                              {t('chat.save')}
                            </button>
                          </div>
                        </div>
                      ) : m.deleted ? (
                        <p className="italic opacity-70">{t('chat.deletedMsg')}</p>
                      ) : (
                        <>
                          {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                          {m.attachment && (
                            <ChatAttachmentView messageId={m.id} attachment={m.attachment} mine={m.mine} />
                          )}
                        </>
                      )}

                      <p
                        className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                          m.mine ? 'text-white/70' : 'text-slate-400'
                        }`}
                      >
                        {m.editedAt && !m.deleted && <span>{t('chat.edited')}</span>}
                        <span>{formatDateTime(m.createdAt)}</span>
                        {/* Ticks de lectura (solo mensajes propios) */}
                        {m.mine && !m.deleted && (
                          <span className={m.read ? 'text-sky-200' : 'text-white/60'}>
                            {m.read ? '✓✓' : '✓'}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Reacciones */}
                    {m.reactions.length > 0 && (
                      <div className={`mt-1 flex flex-wrap gap-1 ${m.mine ? 'justify-end' : ''}`}>
                        {m.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            type="button"
                            onClick={() => onReact?.(m.id, r.emoji)}
                            className={`rounded-full border px-1.5 py-0.5 text-[11px] ${
                              r.mine
                                ? 'border-brand-300 bg-brand-50 text-brand-700'
                                : 'border-slate-200 bg-white text-slate-600'
                            }`}
                          >
                            {r.emoji} {r.count}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Acciones (aparecen al pasar el ratón) */}
                    {!m.deleted && editingId !== m.id && (
                      <div
                        className={`mt-0.5 flex gap-2 text-[11px] text-slate-400 opacity-0 transition group-hover:opacity-100 ${
                          m.mine ? 'justify-end' : ''
                        }`}
                      >
                        <button onClick={() => setReplyTo(m)} className="hover:text-slate-700">
                          {t('chat.reply')}
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setReactFor(reactFor === m.id ? null : m.id)}
                            className="hover:text-slate-700"
                          >
                            {t('chat.react')}
                          </button>
                          {reactFor === m.id && (
                            <div className="absolute bottom-6 z-10 flex gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-elevated">
                              {EMOJIS.map((e) => (
                                <button
                                  key={e}
                                  onClick={() => {
                                    onReact?.(m.id, e);
                                    setReactFor(null);
                                  }}
                                  className="text-base hover:scale-125"
                                >
                                  {e}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {m.mine && m.body && onEdit && (
                          <button onClick={() => startEdit(m)} className="hover:text-slate-700">
                            {t('chat.edit')}
                          </button>
                        )}
                        {m.mine && onDelete && (
                          <button
                            onClick={() => onDelete(m.id)}
                            className="hover:text-red-600"
                          >
                            {t('chat.delete')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Indicador de "escribiendo…" */}
      {typingLabel && (
        <div className="px-3 pb-1 text-[11px] italic text-slate-400">{typingLabel}</div>
      )}

      {/* Banner de respuesta */}
      {replyTo && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="min-w-0 truncate text-slate-500">
            {t('chat.replyingTo')}{' '}
            <span className="text-slate-700">{replyTo.body || t('chat.attachmentWord')}</span>
          </span>
          <button onClick={() => setReplyTo(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Error de adjunto (p. ej. demasiado grande) */}
      {attachError && (
        <div className="border-t border-slate-200 px-3 py-2">
          <Alert>{attachError}</Alert>
        </div>
      )}

      {/* Adjunto seleccionado */}
      {file && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
          <span className="min-w-0 truncate text-slate-600">{t('chat.attachmentLabel')} {file.name}</span>
          <button
            onClick={() => {
              setFile(null);
              setAttachError(null);
            }}
            className="ml-2 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="relative flex items-end gap-1.5 border-t border-slate-200 p-2">
        {showEmoji && (
          <div className="absolute bottom-14 left-2 z-10 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-elevated">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setDraft((d) => d + e)}
                className="text-lg hover:scale-125"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          aria-label={t('chat.attachFile')}
          title={t('chat.attachTitle')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setShowEmoji((s) => !s)}
          disabled={disabled}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          aria-label={t('chat.emojis')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </button>

        <textarea
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={disabled ? t('chat.selectConversationPlaceholder') : t('chat.writeMessage')}
          className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || isSending || (draft.trim() === '' && !file)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {t('chat.send')}
        </button>
      </div>
    </div>
  );
}
