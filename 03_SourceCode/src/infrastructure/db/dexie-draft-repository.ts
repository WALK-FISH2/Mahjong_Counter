import {
  DraftOwnershipError,
  type DraftRepository,
} from '../../application/persistence/draft-repository';
import type { DraftRecord } from '../../application/persistence/persistence-models';
import type { StorageCapability } from '../../application/persistence/storage-capability';
import { parseDraftRecord } from '../../schemas/persistence/batch-21-schema';
import type { MahjongDatabase } from './mahjong-database';
import { decodePersistence, persistenceOperation } from './persistence-operation';

export class DexieDraftRepository implements DraftRepository {
  constructor(
    private readonly db: MahjongDatabase,
    private readonly capability?: StorageCapability,
  ) {}
  private run<T>(operation: () => Promise<T>): Promise<T> {
    // Lost ownership is not a storage outage and must never enable Temporary Mode writes.
    return persistenceOperation(async () => {
      try {
        return { value: await operation() };
      } catch (error) {
        if (error instanceof DraftOwnershipError) return { lost: true as const };
        throw error;
      }
    }, this.capability).then((result) => {
      if ('lost' in result) throw new DraftOwnershipError();
      return result.value;
    });
  }
  async read(): Promise<DraftRecord | null> {
    return this.run(async () => {
      const value = await this.db.draft.get('current');
      return value === undefined ? null : decodePersistence(parseDraftRecord, value);
    });
  }
  claim(
    initial: DraftRecord,
    owner: string,
    token: string,
    now: number,
    ttl: number,
    force: boolean,
  ) {
    return this.run(() =>
      this.db.transaction('rw', this.db.draft, async () => {
        const current = await this.read();
        if (
          current?.lease !== null &&
          current?.lease !== undefined &&
          current.lease.expiresAt > now &&
          current.lease.owner !== owner &&
          !force
        )
          return { acquired: false, created: false, record: current };
        const record = parseDraftRecord({
          ...(current ?? initial),
          lease: { owner, token, expiresAt: now + ttl },
        });
        await this.db.draft.put(record);
        return { acquired: true, created: current === null, record };
      }),
    );
  }
  renew(owner: string, token: string, now: number, ttl: number): Promise<boolean> {
    return this.run(() =>
      this.db.transaction('rw', this.db.draft, async () => {
        const current = await this.read();
        if (
          current?.lease?.owner !== owner ||
          current.lease.token !== token ||
          current.lease.expiresAt <= now
        )
          return false;
        await this.db.draft.put({ ...current, lease: { owner, token, expiresAt: now + ttl } });
        return true;
      }),
    );
  }
  release(owner: string, token: string): Promise<void> {
    return this.run(() =>
      this.db.transaction('rw', this.db.draft, async () => {
        const current = await this.read();
        if (current?.lease?.owner === owner && current.lease.token === token)
          await this.db.draft.put({ ...current, lease: null });
      }),
    );
  }
  write(
    record: DraftRecord,
    owner: string,
    token: string,
    expectedWriteToken: string,
    now: number,
  ): Promise<void> {
    return this.run(() =>
      this.db.transaction('rw', this.db.draft, async () => {
        this.capability?.requirePersistence();
        const current = await this.read();
        if (
          current?.lease?.owner !== owner ||
          current.lease.token !== token ||
          current.lease.expiresAt <= now ||
          current.writeToken !== expectedWriteToken
        )
          throw new DraftOwnershipError();
        await this.db.draft.put(parseDraftRecord({ ...record, lease: current.lease }));
      }),
    );
  }
  probe(initial: DraftRecord): Promise<void> {
    return this.run(() =>
      this.db.transaction('rw', this.db.draft, async () => {
        const existing: unknown = await this.db.draft.get('current');
        await this.db.draft.put(existing ?? parseDraftRecord(initial));
        if (existing === undefined) await this.db.draft.delete('current');
      }),
    );
  }
}
