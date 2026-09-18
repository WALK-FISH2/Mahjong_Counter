import type { RuleSnapshotPort } from '../../application/persistence/rule-snapshot-port';
import type { RuleSnapshotRecord } from '../../application/persistence/persistence-models';
import type { SavedExampleRecord } from '../../application/examples/persistence-models';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import { SavedExampleError } from '../../application/examples/saved-example-repository';
import { parseRuleSnapshot } from '../../schemas/persistence/batch-21-schema';
import { parseRulePackageDefinition } from '../../schemas/rule-package/rule-package-definition-schema';
import { calculateRuleContentHash } from '../content-integrity/rule-content-hash';
import {
  canonicalPersistence,
  decodePersistence,
  persistenceOperation,
} from './persistence-operation';
import type { MahjongDatabase } from './mahjong-database';
import type { StorageCapability } from '../../application/persistence/storage-capability';

export class DexieRuleSnapshots implements RuleSnapshotPort {
  constructor(
    private readonly db: MahjongDatabase,
    private readonly capability?: StorageCapability,
  ) {}
  async capture(rule: RulePackageDefinition): Promise<RuleSnapshotRecord> {
    const payload = Object.fromEntries(
      Object.entries(rule).filter(([key]) => key !== 'encyclopedia'),
    );
    return parseRuleSnapshot({
      snapshotId: `s:${rule.manifest.contentHash}`,
      formatVersion: 1,
      ruleRef: { ruleId: rule.manifest.ruleId, ruleVersion: rule.manifest.ruleVersion },
      contentHash: await calculateRuleContentHash(canonicalPersistence(payload)),
      payload,
    });
  }
  async load(record: SavedExampleRecord): Promise<RulePackageDefinition | null> {
    return persistenceOperation(async () => {
      const raw = await this.db.ruleSnapshots.get(
        `s:${record.resultSnapshot.display.ruleContentHash}`,
      );
      if (raw === undefined) return null;
      const snapshot = decodePersistence(parseRuleSnapshot, raw);
      if (
        snapshot.ruleRef.ruleId !== record.ruleRef.ruleId ||
        snapshot.ruleRef.ruleVersion !== record.ruleRef.ruleVersion ||
        snapshot.payload.manifest.contentHash !== record.resultSnapshot.display.ruleContentHash ||
        snapshot.contentHash !==
          (await calculateRuleContentHash(canonicalPersistence(snapshot.payload)))
      )
        throw new SavedExampleError('RECORD_UNREADABLE');
      return parseRulePackageDefinition({
        ...snapshot.payload,
        encyclopedia: {
          ...snapshot.ruleRef,
          intro: [],
          patternArticles: [],
          examples: [],
          sourceArticles: [],
          knownLimitations: [],
        },
      });
    }, this.capability);
  }
}
