import { parseSavedExample } from '../../schemas/persistence/saved-example-schema';
import type { SavedExampleRecord } from '../../application/examples/persistence-models';
import {
  SavedExampleError,
  type SavedExampleEntry,
  type SavedExampleRepository,
} from '../../application/examples/saved-example-repository';
import type { MahjongDatabase } from './mahjong-database';
import type {
  RuleSnapshotRecord,
  TrashExampleRecord,
} from '../../application/persistence/persistence-models';
import type { StorageCapability } from '../../application/persistence/storage-capability';
import { parseRuleSnapshot, parseTrashExample } from '../../schemas/persistence/batch-21-schema';
import {
  canonicalPersistence as canonical,
  decodePersistence,
  persistenceOperation,
} from './persistence-operation';

export class DexieSavedExampleRepository implements SavedExampleRepository {
  constructor(
    private readonly db: MahjongDatabase,
    private readonly capability?: StorageCapability,
  ) {}

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    return persistenceOperation(operation, this.capability);
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
  private async putSnapshot(record: SavedExampleRecord, snapshot?: RuleSnapshotRecord) {
    if (snapshot === undefined) return;
    const value = decodePersistence(parseRuleSnapshot, snapshot);
    if (
      value.snapshotId !== `s:${record.resultSnapshot.display.ruleContentHash}` ||
      value.ruleRef.ruleId !== record.ruleRef.ruleId ||
      value.ruleRef.ruleVersion !== record.ruleRef.ruleVersion ||
      value.payload.manifest.contentHash !== record.resultSnapshot.display.ruleContentHash
    )
      throw new SavedExampleError('RECORD_CONFLICT');
    const existing = await this.db.ruleSnapshots.get(value.snapshotId);
    if (existing !== undefined && canonical(existing) !== canonical(value))
      throw new SavedExampleError('RECORD_CONFLICT');
    if (existing === undefined) await this.db.ruleSnapshots.add(value);
  }
  add(record: SavedExampleRecord, snapshot?: RuleSnapshotRecord): Promise<void> {
    return this.run(async () => {
      this.capability?.requirePersistence();
      const validated = this.decode(record);
      await this.db.transaction(
        'rw',
        [this.db.savedExamples, this.db.ruleSnapshots, this.db.trashExamples],
        async () => {
          if ((await this.db.savedExamples.get(validated.id)) !== undefined)
            throw new SavedExampleError('RECORD_CONFLICT');
          if ((await this.db.trashExamples.get(validated.id)) !== undefined)
            throw new SavedExampleError('RECORD_CONFLICT');
          await this.putSnapshot(validated, snapshot);
          await this.db.savedExamples.add(validated);
        },
      );
    });
  }
  update(
    record: SavedExampleRecord,
    expected: SavedExampleRecord,
    snapshot?: RuleSnapshotRecord,
  ): Promise<void> {
    return this.run(async () => {
      this.capability?.requirePersistence();
      const validated = this.decode(record);
      if (validated.id !== expected.id || validated.createdAt !== expected.createdAt)
        throw new SavedExampleError('RECORD_CONFLICT');
      await this.db.transaction('rw', [this.db.savedExamples, this.db.ruleSnapshots], async () => {
        const current = await this.db.savedExamples.get(validated.id);
        if (
          current === undefined ||
          canonical(this.decode(current)) !== canonical(this.decode(expected))
        )
          throw new SavedExampleError('RECORD_CONFLICT');
        await this.putSnapshot(validated, snapshot);
        await this.db.savedExamples.put(validated);
      });
    });
  }
  listTrash() {
    return this.run(async () => {
      const entries: (
        | Readonly<{ status: 'available'; record: TrashExampleRecord }>
        | Readonly<{ status: 'unreadable'; id: string }>
      )[] = [];
      await this.db.trashExamples.each((raw, cursor) => {
        try {
          entries.push({ status: 'available', record: parseTrashExample(raw) });
        } catch {
          entries.push({ status: 'unreadable', id: String(cursor.primaryKey) });
        }
      });
      return entries;
    });
  }
  moveToTrash(expected: SavedExampleRecord, trashedAt: string): Promise<void> {
    return this.run(async () => {
      this.capability?.requirePersistence();
      const record = parseTrashExample({ ...this.decode(expected), trashedAt });
      await this.db.transaction('rw', [this.db.savedExamples, this.db.trashExamples], async () => {
        const current = await this.db.savedExamples.get(record.id);
        if (
          canonical(current) !== canonical(expected) ||
          (await this.db.trashExamples.get(record.id)) !== undefined
        )
          throw new SavedExampleError('RECORD_CONFLICT');
        await this.db.trashExamples.add(record);
        await this.db.savedExamples.delete(record.id);
      });
    });
  }
  restoreTrash(expected: TrashExampleRecord): Promise<void> {
    return this.run(async () => {
      this.capability?.requirePersistence();
      const saved = this.decode(
        Object.fromEntries(
          Object.entries(decodePersistence(parseTrashExample, expected)).filter(
            ([key]) => key !== 'trashedAt',
          ),
        ),
      );
      await this.db.transaction('rw', [this.db.savedExamples, this.db.trashExamples], async () => {
        if (
          canonical(await this.db.trashExamples.get(saved.id)) !== canonical(expected) ||
          (await this.db.savedExamples.get(saved.id)) !== undefined
        )
          throw new SavedExampleError('RECORD_CONFLICT');
        await this.db.savedExamples.add(this.decode(saved));
        await this.db.trashExamples.delete(saved.id);
      });
    });
  }
  permanentlyDelete(expected: TrashExampleRecord): Promise<void> {
    return this.run(async () => {
      this.capability?.requirePersistence();
      decodePersistence(parseTrashExample, expected);
      await this.db.transaction('rw', this.db.trashExamples, async () => {
        if (canonical(await this.db.trashExamples.get(expected.id)) !== canonical(expected))
          throw new SavedExampleError('RECORD_CONFLICT');
        await this.db.trashExamples.delete(expected.id);
        // Snapshot GC is deliberately deferred; never delete still-referenced rule facts.
      });
    });
  }
}
