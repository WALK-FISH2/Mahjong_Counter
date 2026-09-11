import Dexie, { type Table } from 'dexie';
import { DATABASE_SCHEMA_VERSION } from '../../app/version';

export const DATABASE_STORES = {
  savedExamples: 'id, modifiedAt, name, ruleRef.ruleId, [ruleRef.ruleId+ruleRef.ruleVersion]',
  trashExamples: 'id, trashedAt, modifiedAt',
  draft: 'key',
  ruleSnapshots: 'snapshotId, [ruleRef.ruleId+ruleRef.ruleVersion], contentHash',
  rulePackageMetadata: '[ruleRef.ruleId+ruleRef.ruleVersion]',
  migrationBackups: 'id',
} as const;

export class MahjongDatabase extends Dexie {
  // Reads remain unknown until schema validation. Other stores are empty scaffolding in T901.
  readonly savedExamples: Table<unknown, string>;

  constructor(name = 'MahjongFanCalculatorDB', options?: ConstructorParameters<typeof Dexie>[1]) {
    super(name, options);
    this.version(DATABASE_SCHEMA_VERSION).stores(DATABASE_STORES);
    this.savedExamples = this.table('savedExamples');
  }
}
