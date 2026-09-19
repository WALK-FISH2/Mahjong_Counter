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
  // Every persisted value remains unknown until schema validation.
  readonly savedExamples: Table<unknown, string>;
  readonly trashExamples: Table<unknown, string>;
  readonly draft: Table<unknown, string>;
  readonly ruleSnapshots: Table<unknown, string>;

  constructor(
    name = 'MahjongFanCalculatorDB',
    options?: ConstructorParameters<typeof Dexie>[1],
    version: number = DATABASE_SCHEMA_VERSION,
  ) {
    super(name, options);
    this.version(version).stores(DATABASE_STORES);
    this.savedExamples = this.table('savedExamples');
    this.trashExamples = this.table('trashExamples');
    this.draft = this.table('draft');
    this.ruleSnapshots = this.table('ruleSnapshots');
  }
}
