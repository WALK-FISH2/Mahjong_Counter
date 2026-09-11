import { parseSavedExample } from '../../schemas/persistence/saved-example-schema';
import type { SavedExampleRecord } from '../../application/examples/persistence-models';
import {
  SavedExampleError,
  type SavedExampleEntry,
  type SavedExampleRepository,
} from '../../application/examples/saved-example-repository';
import type { MahjongDatabase } from './mahjong-database';

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item: unknown) => canonical(item)).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

export class DexieSavedExampleRepository implements SavedExampleRepository {
  constructor(private readonly db: MahjongDatabase) {}

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof SavedExampleError) throw error;
      throw new SavedExampleError(
        error instanceof Error && error.name === 'QuotaExceededError'
          ? 'STORAGE_QUOTA'
          : 'STORAGE_UNAVAILABLE',
      );
    }
  }
  private decode(value: unknown): SavedExampleRecord {
    try {
      return parseSavedExample(value);
    } catch {
      throw new SavedExampleError('RECORD_UNREADABLE');
    }
  }
  list(): Promise<readonly SavedExampleEntry[]> {
    return this.run(async () => {
      const entries: SavedExampleEntry[] = [];
      await this.db.savedExamples.each((value, cursor) => {
        try {
          entries.push({ status: 'available', record: this.decode(value) });
        } catch {
          entries.push({ status: 'unreadable', id: String(cursor.primaryKey) });
        }
      });
      return entries;
    });
  }
  get(id: string): Promise<SavedExampleRecord | null> {
    return this.run(async () => {
      const value = await this.db.savedExamples.get(id);
      return value === undefined ? null : this.decode(value);
    });
  }
  add(record: SavedExampleRecord): Promise<void> {
    return this.run(async () => {
      const validated = this.decode(record);
      await this.db.transaction('rw', this.db.savedExamples, async () => {
        if ((await this.db.savedExamples.get(validated.id)) !== undefined)
          throw new SavedExampleError('RECORD_CONFLICT');
        await this.db.savedExamples.add(validated);
      });
    });
  }
  update(record: SavedExampleRecord, expected: SavedExampleRecord): Promise<void> {
    return this.run(async () => {
      const validated = this.decode(record);
      if (validated.id !== expected.id || validated.createdAt !== expected.createdAt)
        throw new SavedExampleError('RECORD_CONFLICT');
      await this.db.transaction('rw', this.db.savedExamples, async () => {
        const current = await this.db.savedExamples.get(validated.id);
        if (
          current === undefined ||
          canonical(this.decode(current)) !== canonical(this.decode(expected))
        )
          throw new SavedExampleError('RECORD_CONFLICT');
        await this.db.savedExamples.put(validated);
      });
    });
  }
}
