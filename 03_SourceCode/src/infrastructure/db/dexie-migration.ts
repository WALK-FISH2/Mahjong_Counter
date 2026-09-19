import Dexie, { type Transaction, type Table } from 'dexie';
import type {
  DatabaseMigrationPort,
  MigrationOutcome,
} from '../../application/persistence/database-migration';
import { parseSavedExample } from '../../schemas/persistence/saved-example-schema';
import {
  parseDraftRecord,
  parseTrashExample,
  parseRuleSnapshot,
} from '../../schemas/persistence/batch-21-schema';
import { DATABASE_STORES } from './mahjong-database';
import { canonicalPersistence } from './persistence-operation';

const DATA_STORES = Object.keys(DATABASE_STORES).filter((name) => name !== 'migrationBackups');
type Rows = Record<string, unknown[]>;
export interface MigrationStep {
  from: number;
  to: number;
  stage: (transaction: Transaction) => Promise<readonly string[]>;
}
// Version 2 introduces the validated migration ledger, without rewriting v1 business DTOs.
export const DATABASE_MIGRATIONS: readonly MigrationStep[] = [
  {
    from: 1,
    to: 2,
    async stage(transaction) {
      const issues: string[] = [];
      const parsers = [
        ['savedExamples', parseSavedExample],
        ['trashExamples', parseTrashExample],
        ['draft', parseDraftRecord],
        ['ruleSnapshots', parseRuleSnapshot],
      ] as const;
      for (const [name, parse] of parsers) {
        await transaction.table(name).each((raw: unknown, cursor) => {
          try {
            parse(raw);
          } catch {
            issues.push(`${name}:${String(cursor.primaryKey)}:READ_ONLY_UNSUPPORTED`);
          }
        });
      }
      return issues;
    },
  },
];

async function readRows(db: { table: (name: string) => Table<unknown> }): Promise<Rows> {
  const rows: Rows = {};
  for (const name of DATA_STORES) rows[name] = await db.table(name).toArray();
  return rows;
}
export class DexieMigration implements DatabaseMigrationPort {
  constructor(
    private readonly input: Readonly<{
      name: string;
      options?: ConstructorParameters<typeof Dexie>[1];
      preferencesRaw: () => string | null;
      id: () => string;
      now: () => string;
      steps?: readonly MigrationStep[];
    }>,
  ) {}
  async migrate(target: number): Promise<MigrationOutcome> {
    const old = new Dexie(this.input.name, this.input.options);
    let version = target;
    let backupId: string | null = null;
    try {
      try {
        await old.open();
      } catch (error) {
        if (error instanceof Error && error.name === 'NoSuchDatabaseError')
          return { version: target, writable: true, reason: null, backupId: null };
        throw error;
      }
      version = old.verno;
      if (version > target)
        return { version, writable: false, reason: 'DATABASE_NEWER_READ_ONLY', backupId };
      if (version === target) {
        const marker: unknown = await old.table('migrationBackups').get('migration-readonly');
        return {
          version,
          writable: marker === undefined,
          reason: marker === undefined ? null : 'MIGRATION_RECORDS_READ_ONLY',
          backupId,
        };
      }
      const path: MigrationStep[] = [];
      let cursor = version;
      while (cursor < target) {
        const step = (this.input.steps ?? DATABASE_MIGRATIONS).find(
          (item) => item.from === cursor && item.to > cursor && item.to <= target,
        );
        if (step === undefined)
          return { version, writable: false, reason: 'MIGRATION_PATH_UNAVAILABLE', backupId };
        path.push(step);
        cursor = step.to;
      }
      // A separate committed transaction: rollback of the upgrade cannot remove this backup.
      const preferences = this.input.preferencesRaw();
      const candidateBackupId = this.input.id();
      const rows = await old.transaction('rw', old.tables, async () => {
        const data = await readRows(old);
        await old.table('migrationBackups').add({
          id: candidateBackupId,
          kind: 'pre-migration',
          from: version,
          to: target,
          createdAt: this.input.now(),
          preferences,
          data,
        });
        return data;
      });
      backupId = candidateBackupId;
      old.close();
      const upgrade = new Dexie(this.input.name, this.input.options);
      upgrade.version(version).stores(DATABASE_STORES);
      upgrade
        .version(target)
        .stores(DATABASE_STORES)
        .upgrade(async (transaction) => {
          // Detect a writer in the interval before the exclusive versionchange transaction.
          if (canonicalPersistence(await readRows(transaction)) !== canonicalPersistence(rows))
            throw new Error('MIGRATION_CONCURRENT_WRITE');
          const issues: string[] = [];
          for (const step of path) issues.push(...(await step.stage(transaction)));
          if (issues.length > 0)
            await transaction.table('migrationBackups').put({ id: 'migration-readonly', issues });
          await transaction
            .table('migrationBackups')
            .put({ id: `migration-committed-${target}`, backupId, from: version, to: target });
        });
      try {
        await upgrade.open();
        version = target;
        const marker: unknown = await upgrade.table('migrationBackups').get('migration-readonly');
        return {
          version: target,
          writable: marker === undefined,
          reason: marker === undefined ? null : 'MIGRATION_RECORDS_READ_ONLY',
          backupId,
        };
      } finally {
        upgrade.close();
      }
    } catch (error) {
      return {
        version,
        writable: false,
        reason: `MIGRATION_FAILED:${error instanceof Error ? error.name : 'unknown'}`,
        backupId,
      };
    } finally {
      old.close();
    }
  }
}
