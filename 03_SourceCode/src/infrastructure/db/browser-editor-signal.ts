import type { EditorSignalPort } from '../../application/persistence/draft-controller';

// BroadcastChannel is an acceleration only. IndexedDB transactions + lease polling remain authoritative.
export function createBrowserEditorSignal(): EditorSignalPort {
  let channel: BroadcastChannel | null = null;
  const listeners = new Set<(message: 'changed' | 'yield') => void>();
  try {
    channel = new BroadcastChannel('mahjong-calculator-editor');
  } catch {
    /* Polling fallback. */
  }
  if (channel !== null)
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (event.data === 'changed' || event.data === 'yield')
        listeners.forEach((listener) => listener(event.data === 'yield' ? 'yield' : 'changed'));
    };
  return {
    publish(message) {
      try {
        channel?.postMessage(message);
      } catch {
        /* Lease polling still protects writes. */
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    close() {
      channel?.close();
      listeners.clear();
    },
  };
}
