// ─── Server-Sent Events (SSE) parser for live updates ───

import type { LiveEvent } from '../types/tender';

type EventHandler = (event: LiveEvent) => void;

const SSE_URL = import.meta.env.VITE_SSE_URL || '/api/events';

// Global event listeners — any component can subscribe to SSE events
// without creating its own EventSource connection.
const globalListeners: Set<EventHandler> = new Set();
let eventSource: EventSource | null = null;
let connectionCount = 0;

function ensureConnection() {
  if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
    return;
  }

  eventSource = new EventSource(SSE_URL);

  eventSource.onmessage = (e) => {
    try {
      const parsed: LiveEvent = JSON.parse(e.data);
      globalListeners.forEach((cb) => cb(parsed));
    } catch {
      console.warn('[SSE] Failed to parse event:', e.data);
    }
  };

  const eventTypes = [
    'NEW_TENDER',
    'SCORE_UPDATED',
    'APPROVAL_CHANGED',
    'SCAN_STARTED',
    'SCAN_COMPLETED',
    'SCAN_ERROR',
    'SCAN_INFO',
  ] as const;

  eventTypes.forEach((type) => {
    eventSource!.addEventListener(type, ((e: MessageEvent) => {
      try {
        const parsed: LiveEvent = JSON.parse(e.data);
        const event = { ...parsed, type } as LiveEvent;
        globalListeners.forEach((cb) => cb(event));
      } catch {
        console.warn(`[SSE] Failed to parse ${type} event:`, e.data);
      }
    }) as EventListener);
  });

  eventSource.onerror = (e) => {
    console.error('[SSE] Connection error:', e);
  };
}

/**
 * Subscribe to global SSE events. Returns an unsubscribe function.
 * Use this to react to scan events (e.g. invalidate queries on SCAN_COMPLETED).
 */
export function subscribeToSSEEvents(onEvent: EventHandler): () => void {
  globalListeners.add(onEvent);
  connectionCount++;
  ensureConnection();

  return () => {
    globalListeners.delete(onEvent);
    connectionCount--;
    if (connectionCount <= 0 && eventSource) {
      eventSource.close();
      eventSource = null;
      connectionCount = 0;
    }
  };
}

/**
 * Create a persistent SSE connection for real-time tender updates.
 * Returns a cleanup function to close the connection.
 */
export function connectLiveFeed(
  onEvent: EventHandler,
  onError?: (error: Event) => void,
): () => void {
  // Use the global subscription so we share a single EventSource
  const unsubscribe = subscribeToSSEEvents(onEvent);

  if (onError && eventSource) {
    const handler = () => onError(new Event('error'));
    eventSource.addEventListener('error', handler);
    return () => {
      eventSource?.removeEventListener('error', handler);
      unsubscribe();
    };
  }

  return unsubscribe;
}