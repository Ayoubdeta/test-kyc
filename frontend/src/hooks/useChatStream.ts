import { useEffect, useRef } from 'react';
import { config } from '../lib/config';
import type { ChatStreamEvent } from '../types';

/**
 * Suscribe la pestaña al stream de eventos del chat (SSE). Los eventos son
 * señales ("algo cambió") que el consumidor usa para refrescar; el detalle se
 * recarga por la vía normal. EventSource reconecta solo si se cae la conexión.
 */
export function useChatStream(onEvent: (event: ChatStreamEvent) => void, enabled = true): void {
  // Guardamos el callback en una ref para no reabrir el stream cada render.
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    // SSE deshabilitado por entorno (p. ej. en la demo serverless de Vercel):
    // el chat refresca por polling. En local (variable sin definir) sigue activo.
    if (!enabled || import.meta.env.VITE_ENABLE_SSE === 'false') return;
    const source = new EventSource(`${config.apiUrl}/chat/stream`, { withCredentials: true });

    source.onmessage = (ev) => {
      try {
        handlerRef.current(JSON.parse(ev.data) as ChatStreamEvent);
      } catch {
        // Ignoramos payloads no-JSON (p. ej. comentarios de keep-alive).
      }
    };
    // No hacemos nada en onerror: EventSource reintenta la conexión por sí solo.
    source.onerror = () => undefined;

    return () => source.close();
  }, [enabled]);
}
