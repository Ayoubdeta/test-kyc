import { EventEmitter } from 'node:events';
import type { ChatSender } from '../config/constants';

/**
 * Bus de eventos del chat para SSE (Server-Sent Events). Es un EventEmitter en
 * memoria: vale porque el backend corre como una única instancia. Si algún día
 * se escala a varias réplicas, habría que sustituirlo por un pub/sub externo
 * (p. ej. Redis) — el resto del código (emisores/suscriptores) no cambiaría.
 *
 * Los eventos son SEÑALES ligeras ("algo cambió en esta conversación"), no el
 * mensaje completo: el frontend recibe la señal y refresca la conversación por
 * su vía normal. Así el mapeo por-espectador (mine / reacción propia) siempre
 * lo hace el servidor de forma correcta y no duplicamos lógica.
 */
export type ChatEvent =
  // Nuevo mensaje o cambio (edición/borrado/reacción) en la conversación.
  | { type: 'message' | 'updated'; clientId: string }
  // La otra parte leyó: el emisor refresca sus "ticks".
  | { type: 'read'; clientId: string; reader: ChatSender }
  // Indicador efímero de "escribiendo…".
  | { type: 'typing'; clientId: string; senderRole: ChatSender; senderName: string | null };

const emitter = new EventEmitter();
// Puede haber muchos suscriptores (una conexión SSE por pestaña abierta).
emitter.setMaxListeners(0);

const CHANNEL = 'chat';

export const chatBus = {
  emit(event: ChatEvent): void {
    emitter.emit(CHANNEL, event);
  },
  subscribe(listener: (event: ChatEvent) => void): () => void {
    emitter.on(CHANNEL, listener);
    // Devuelve la función para desuscribirse (al cerrar la conexión SSE).
    return () => emitter.off(CHANNEL, listener);
  },
};
