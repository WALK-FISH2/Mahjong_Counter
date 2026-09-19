import type { EditorLockPort } from '../../application/persistence/draft-controller';
import { createBroadcastEditorLock } from './broadcast-editor-lock';

// Web Locks additionally coordinate isolated Temporary Mode editors when IndexedDB has failed.
// Persistent writes are still fenced by the IndexedDB lease/token transaction.
export function createBrowserEditorLock(): EditorLockPort {
  if (navigator.locks === undefined) {
    const broadcast = createBroadcastEditorLock();
    if (broadcast !== undefined) return broadcast;
  }
  let release: (() => void) | undefined;
  let held = false;
  let sequence = 0;
  return {
    isHeld: () => held,
    async claim(force, onLost) {
      if (held && !force) return true;
      release?.();
      const request = ++sequence;
      if (navigator.locks === undefined) {
        held = true;
        return true;
      }
      return new Promise<boolean>((resolve) => {
        void navigator.locks
          .request(
            'mahjong-calculator-editor',
            force ? { steal: true } : { ifAvailable: true },
            async (lock) => {
              if (lock === null || request !== sequence) {
                resolve(false);
                return;
              }
              held = true;
              await new Promise<void>((done) => {
                release = done;
                resolve(true);
              });
            },
          )
          .catch(() => {
            if (request === sequence) {
              held = false;
              onLost();
            }
            resolve(false);
          });
      });
    },
    release() {
      sequence++;
      held = false;
      release?.();
      release = undefined;
    },
  };
}
