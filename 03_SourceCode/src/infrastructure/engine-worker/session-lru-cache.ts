export class SessionLruCache<T> {
  readonly #capacity: number;
  readonly #entries = new Map<string, T>();

  constructor(capacity: number) {
    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      throw new RangeError('Session LRU capacity must be a positive safe integer.');
    }
    this.#capacity = capacity;
  }

  get(key: string): T | undefined {
    const value = this.#entries.get(key);
    if (value === undefined) return undefined;
    this.#entries.delete(key);
    this.#entries.set(key, value);
    return value;
  }

  set(key: string, value: T): void {
    this.#entries.delete(key);
    this.#entries.set(key, value);
    while (this.#entries.size > this.#capacity) {
      const oldest = this.#entries.keys().next().value;
      if (oldest === undefined) break;
      this.#entries.delete(oldest);
    }
  }

  get size(): number {
    return this.#entries.size;
  }
}
