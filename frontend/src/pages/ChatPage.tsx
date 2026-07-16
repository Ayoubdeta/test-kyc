import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { chatApi, type SendPayload } from '../api/chat.api';
import { ChatThread } from '../components/ChatThread';
import { useChatStream } from '../hooks/useChatStream';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { formatDateTime } from '../lib/format';
import type { ChatStreamEvent } from '../types';

const CONV_KEY = ['chat', 'conversations'] as const;

export function ChatPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: CONV_KEY,
    queryFn: chatApi.conversations,
    refetchInterval: 30_000,
  });

  const messagesKey = ['chat', 'conversation', selected] as const;
  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: messagesKey,
    queryFn: () => chatApi.conversationMessages(selected as string),
    enabled: selected !== null,
  });

  // Tiempo real: refresca la lista y el hilo abierto; muestra "escribiendo…".
  const onEvent = useCallback(
    (ev: ChatStreamEvent) => {
      if (ev.type === 'typing') {
        if (ev.clientId === selectedRef.current) {
          setTypingLabel('El cliente está escribiendo…');
          clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setTypingLabel(null), 3000);
        }
        return;
      }
      void queryClient.invalidateQueries({ queryKey: CONV_KEY });
      if (ev.clientId === selectedRef.current) {
        void queryClient.invalidateQueries({ queryKey: ['chat', 'conversation', ev.clientId] });
      }
    },
    [queryClient],
  );
  useChatStream(onEvent);

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  const invalidateThread = () => {
    void queryClient.invalidateQueries({ queryKey: messagesKey });
    void queryClient.invalidateQueries({ queryKey: CONV_KEY });
  };

  const send = useMutation({
    mutationFn: (payload: SendPayload) => chatApi.sendToClient(selected as string, payload),
    onSuccess: invalidateThread,
  });
  const edit = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => chatApi.edit(id, body),
    onSuccess: invalidateThread,
  });
  const remove = useMutation({
    mutationFn: (id: string) => chatApi.remove(id),
    onSuccess: invalidateThread,
  });
  const react = useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) => chatApi.react(id, emoji),
    onSuccess: invalidateThread,
  });

  const openConversation = async (clientId: string) => {
    setSelected(clientId);
    setTypingLabel(null);
    await queryClient.invalidateQueries({ queryKey: CONV_KEY });
  };

  const current = conversations.find((c) => c.clientId === selected);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Chat con clientes</h1>
        <p className="text-sm text-slate-500">Responde las consultas de los clientes en tiempo real.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
        {/* Lista de conversaciones */}
        <div className="animate-fade-in-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            Conversaciones
          </div>
          {isLoading ? (
            <p className="p-4 text-sm text-slate-500">Cargando…</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aún no hay conversaciones.</p>
          ) : (
            <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
              {conversations.map((c) => (
                <li key={c.clientId}>
                  <button
                    type="button"
                    onClick={() => openConversation(c.clientId)}
                    className={`flex w-full items-start gap-2 px-4 py-3 text-left transition hover:bg-slate-50 ${
                      selected === c.clientId ? 'bg-brand-50' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{c.name}</p>
                      <p className="truncate text-xs text-slate-500">{c.lastMessage}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{formatDateTime(c.lastAt)}</p>
                    </div>
                    {c.unread > 0 && (
                      <span className="mt-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">
                        {c.unread > 9 ? '9+' : c.unread}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Hilo seleccionado */}
        <div className="flex h-[34rem] animate-fade-in-up flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          {selected ? (
            <>
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">{current?.name}</p>
                <p className="text-xs text-slate-500">{current?.email}</p>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatThread
                  messages={messages}
                  isLoading={loadingMsgs}
                  isSending={send.isPending}
                  typingLabel={typingLabel}
                  onSend={(p) => send.mutate(p)}
                  onEdit={(id, body) => edit.mutate({ id, body })}
                  onDelete={(id) => remove.mutate(id)}
                  onReact={(id, emoji) => react.mutate({ id, emoji })}
                  onTyping={() => selected && void chatApi.typingToClient(selected)}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-400">
              Selecciona una conversación para ver los mensajes.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
