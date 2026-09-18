import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBroadcastEditorLock } from './broadcast-editor-lock';
import type { EditorLockPort } from '../../application/persistence/draft-controller';

class Channel {
  static peers = new Set<Channel>();
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  silent = false;
  constructor() {
    Channel.peers.add(this);
  }
  postMessage(data: unknown) {
    if (this.silent) return;
    for (const peer of Channel.peers)
      if (peer !== this)
        queueMicrotask(() => peer.onmessage?.(new MessageEvent('message', { data })));
  }
  close() {
    Channel.peers.delete(this);
  }
}
const locks: EditorLockPort[] = [];
function lock() {
  const value = createBroadcastEditorLock();
  if (value === undefined) throw new Error('missing fixture channel');
  locks.push(value);
  return value;
}
async function settle<T>(promise: Promise<T>) {
  await vi.advanceTimersByTimeAsync(200);
  return promise;
}
beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
  });
  vi.stubGlobal('BroadcastChannel', Channel);
});
afterEach(() => {
  locks.splice(0).forEach((value) => value.close?.());
  Channel.peers.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('T912/T913 Broadcast lock when Web Locks is unavailable', () => {
  it('elects a single concurrent claimant and keeps the secondary read-only until explicit takeover', async () => {
    const a = lock();
    const b = lock();
    const lostA = vi.fn();
    const lostB = vi.fn();
    const claims = await settle(Promise.all([a.claim(false, lostA), b.claim(false, lostB)]));
    expect(claims.filter(Boolean)).toHaveLength(1);
    const primary = a.isHeld() ? a : b;
    const secondary = a.isHeld() ? b : a;
    expect(await settle(secondary.claim(false, vi.fn()))).toBe(false);
    expect(await settle(secondary.claim(true, vi.fn()))).toBe(true);
    expect(primary.isHeld()).toBe(false);
    expect(lostA.mock.calls.length + lostB.mock.calls.length).toBe(1);
    expect(await settle(primary.claim(false, vi.fn()))).toBe(false);
  });
  it('expires a stopped owner heartbeat without a permanent lock and ignores malformed signals', async () => {
    const a = lock();
    const b = lock();
    expect(await settle(a.claim(false, vi.fn()))).toBe(true);
    expect(await settle(b.claim(false, vi.fn()))).toBe(false);
    const first = [...Channel.peers][0]!;
    first.postMessage({
      kind: 'heartbeat',
      owner: 'attacker',
      term: 'not-a-number',
      expiresAt: Infinity,
    });
    first.silent = true;
    await vi.advanceTimersByTimeAsync(6200);
    expect(await settle(b.claim(false, vi.fn()))).toBe(true);
    expect(a.isHeld()).toBe(false);
  });
  it('defers to the IndexedDB lease when BroadcastChannel cannot be created', () => {
    vi.stubGlobal(
      'BroadcastChannel',
      class {
        constructor() {
          throw new Error('unavailable');
        }
      },
    );
    expect(createBroadcastEditorLock()).toBeUndefined();
  });
});
