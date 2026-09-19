import type { LocalDataPort } from '../../application/persistence/local-data-management';
import type { DraftRecord } from '../../application/persistence/persistence-models';
import { DraftOwnershipError } from '../../application/persistence/draft-repository';
import type { StorageCapability } from '../../application/persistence/storage-capability';
import type { LocalPreferences } from '../preferences/local-preferences';
import { parseDraftRecord } from '../../schemas/persistence/batch-21-schema';
import type { MahjongDatabase } from './mahjong-database';
import { persistenceOperation } from './persistence-operation';

export class DexieLocalData implements LocalDataPort {
  constructor(
    private readonly input: Readonly<{
      db: MahjongDatabase;
      preferences: LocalPreferences;
      storage: StorageCapability;
      fence: () => Readonly<{ owner: string; token: string; blank: DraftRecord }>;
      now: () => number;
      estimate: () => Promise<Readonly<{ usage?: number; quota?: number }>>;
    }>,
  ) {}
  async estimate() {
    try {
      const result = await this.input.estimate();
      const safe = (value: number | undefined) =>
        value !== undefined && Number.isFinite(value) && value >= 0 ? value : null;
      return { usage: safe(result.usage), quota: safe(result.quota) };
    } catch {
      return { usage: null, quota: null };
    }
  }
  async clear() {
    this.input.storage.requirePersistence();
    const fence = this.input.fence();
    const preferences = this.input.preferences.raw();
    let preferencesRemoved = false;
    try {
      await this.input.db.transaction('rw', this.input.db.tables, async () => {
        const current = parseDraftRecord(await this.input.db.draft.get('current'));
        if (
          current.lease?.owner !== fence.owner ||
          current.lease.token !== fence.token ||
          current.lease.expiresAt <= this.input.now()
        )
          throw new DraftOwnershipError();
        if (this.input.preferences.raw() !== preferences) throw new Error('PREFERENCES_CHANGED');
        for (const table of this.input.db.tables) await table.clear();
        // A blank fenced Draft prevents a late old tab from resurrecting deleted input.
        await this.input.db.draft.put(parseDraftRecord(fence.blank));
        this.input.preferences.restoreRaw(null);
        preferencesRemoved = true;
      });
    } catch (error) {
      if (preferencesRemoved) this.input.preferences.restoreRaw(preferences);
      if (
        error instanceof DraftOwnershipError ||
        (error instanceof Error && error.message === 'PREFERENCES_CHANGED')
      )
        throw error;
      await persistenceOperation(
        () => Promise.reject(error instanceof Error ? error : new Error('CLEAR_FAILED')),
        this.input.storage,
      );
    }
    this.input.preferences.acceptCleared();
  }
}
