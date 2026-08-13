import { describe, expect, it } from 'vitest';

import { SessionLruCache } from './session-lru-cache';

describe('SessionLruCache', () => {
  it('refreshes reads and evicts the least-recently-used entry at capacity', () => {
    const cache = new SessionLruCache<number>(2);
    cache.set('first', 1);
    cache.set('second', 2);
    expect(cache.get('first')).toBe(1);

    cache.set('third', 3);

    expect(cache.get('second')).toBeUndefined();
    expect(cache.get('first')).toBe(1);
    expect(cache.get('third')).toBe(3);
    expect(cache.size).toBe(2);
  });
});
