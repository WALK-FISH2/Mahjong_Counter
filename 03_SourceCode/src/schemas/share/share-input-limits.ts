import { ShareError } from '../../application/share/share-models';

// Project security budgets, not browser/platform maximums or saved-record count limits.
export const MAX_SAFE_SHARE_URL_LENGTH = 8_000;
export const MAX_DECOMPRESSED_SHARE_BYTES = 1_048_576;
export const MAX_JSON_DEPTH = 32;
export const MAX_JSON_NODES = 100_000;
export const MAX_OBJECT_FIELDS = 256;
export const MAX_ARRAY_ITEMS = 10_000;
export const MAX_SHARE_STRING_LENGTH = 16_384;
export const MAX_ENCODED_SHARE_LENGTH = 8_000;

export function assertShareResources(input: unknown): void {
  let nodes = 0;
  const ancestors = new Set<object>();
  function visit(value: unknown, depth: number): void {
    if (++nodes > MAX_JSON_NODES || depth > MAX_JSON_DEPTH) throw new ShareError('SHARE_LIMIT');
    if (value === null || typeof value === 'boolean') return;
    if (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      Math.abs(value) <= Number.MAX_SAFE_INTEGER
    )
      return;
    if (typeof value === 'string' && value.length <= MAX_SHARE_STRING_LENGTH) return;
    if (typeof value !== 'object' || ancestors.has(value))
      throw new ShareError('SHARE_INVALID_VALUE');
    ancestors.add(value);
    if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_ITEMS) throw new ShareError('SHARE_LIMIT');
      value.forEach((item: unknown) => visit(item, depth + 1));
    } else {
      if (
        Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null
      )
        throw new ShareError('SHARE_INVALID_OBJECT');
      const entries = Object.entries(value);
      if (entries.length > MAX_OBJECT_FIELDS) throw new ShareError('SHARE_LIMIT');
      for (const [key, child] of entries) {
        if (['__proto__', 'constructor', 'prototype'].includes(key))
          throw new ShareError('SHARE_INVALID_KEY');
        visit(key, depth + 1);
        visit(child, depth + 1);
      }
    }
    ancestors.delete(value);
  }
  visit(input, 0);
}
