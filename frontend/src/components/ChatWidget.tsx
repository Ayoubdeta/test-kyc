import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { chatApi, type SendPayload } from '../api/chat.api';
import { useChatStream } from '../hooks/useChatStream';
import { useI18n } from '../i18n';
import type { ChatStreamEvent } from '../types';
import { ChatThread } from './ChatThread';

const MESSAGES_KEY = ['chat', 'me'] as const;
const UNREAD_KEY = ['chat', 'me', 'unread'] as const;

// Chat flotante para el cliente (esquina inferior derecha).
export function ChatWidget() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();

  const { data: unread = 0 } = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: chatApi.myUnread,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: MESSAGES_KEY,
    queryFn: chatApi.myMessages,
    enabled: open,
  });

  // Tiempo real: cualquier cambio refresca; "escribiendo…" muestra el aviso.
  const onEvent = useCallback(
    (ev: ChatStreamEvent) => {
      if (ev.type === 'typing') {
        setTypingLabel(t('chat.teamTyping'));
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTypingLabel(null), 3000);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
      if (open) void queryClient.invalidateQueries({ queryKey: MESSAGES_KEY });
    },
    [open, queryClient, t],
  );
  useChatStream(onEvent);

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: MESSAGES_KEY });

  const send = useMutation({
    mutationFn: (payload: SendPayload) => chatApi.sendMine(payload),
    onSuccess: invalidate,
  });
  const edit = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => chatApi.edit(id, body),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => chatApi.remove(id),
    onSuccess: invalidate,
  });
  const react = useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) => chatApi.react(id, emoji),
    onSuccess: invalidate,
  });

  const openChat = async () => {
    setOpen(true);
    await queryClient.invalidateQueries({ queryKey: MESSAGES_KEY });
    await queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
  };

  return (
    <div className="fixed bottom-5 end-5 z-40">
      {open && (
        <div className="mb-3 flex h-[30rem] w-[23rem] max-w-[calc(100vw-2.5rem)] animate-scale-in flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-elevated">
          <div className="flex items-center justify-between bg-gradient-to-r from-brand-700 to-brand-600 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">{t('chat.widgetTitle')}</p>
              <p className="text-[11px] text-white/80">{t('chat.widgetSubtitle')}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-white/90 hover:bg-white/10"
              aria-label={t('chat.closeChat')}
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatThread
              messages={messages}
              isLoading={isLoading}
              isSending={send.isPending}
              typingLabel={typingLabel}
              onSend={(p) => send.mutate(p)}
              onEdit={(id, body) => edit.mutate({ id, body })}
              onDelete={(id) => remove.mutate(id)}
              onReact={(id, emoji) => react.mutate({ id, emoji })}
              onTyping={() => void chatApi.typingMine()}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openChat())}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-elevated transition hover:bg-brand-700"
        aria-label={t('chat.openChat')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {unread > 0 && !open && (
          <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-brand-700 ring-2 ring-brand-600">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
