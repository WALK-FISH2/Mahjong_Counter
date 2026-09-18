import type { RuleSnapshotRecord } from './persistence-models';
import type { SavedExampleRecord } from '../examples/persistence-models';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';

export interface RuleSnapshotPort {
  capture(rule: RulePackageDefinition): Promise<RuleSnapshotRecord>;
  load(record: SavedExampleRecord): Promise<RulePackageDefinition | null>;
}
