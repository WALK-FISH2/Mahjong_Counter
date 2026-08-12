import { describe, expect, it } from 'vitest';

import { calculateRulePackageContentHash } from '../../../infrastructure/content-integrity/rule-content-hash';
import { parseRulePackageDefinition } from '../../../schemas/rule-package/rule-package-definition-schema';
import { COMMON_SIMPLE_PATTERN_FACTS, commonSimpleRulePackageInput } from './rule-package';

describe('common-simple@1.0.0 RulePackage', () => {
  it('is a valid pure-data package with a matching canonical content hash', async () => {
    const rulePackage = parseRulePackageDefinition(commonSimpleRulePackageInput);

    expect(await calculateRulePackageContentHash(rulePackage)).toBe(
      rulePackage.manifest.contentHash,
    );
    expect(JSON.parse(JSON.stringify(commonSimpleRulePackageInput))).toEqual(
      commonSimpleRulePackageInput,
    );
  });

  it('contains the frozen 81/78/3 pattern catalog and structure policy', () => {
    const rulePackage = parseRulePackageDefinition(commonSimpleRulePackageInput);
    const enabledPatterns = rulePackage.patterns.filter(({ enabled }) => enabled);
    const disabledPatterns = rulePackage.patterns.filter(({ enabled }) => !enabled);

    expect(COMMON_SIMPLE_PATTERN_FACTS).toHaveLength(81);
    expect(enabledPatterns).toHaveLength(78);
    expect(disabledPatterns.map(({ patternId }) => patternId)).toEqual([
      'greaterHonorsAndKnittedTiles',
      'lesserHonorsAndKnittedTiles',
      'knittedStraight',
    ]);
    expect(rulePackage.structures.filter(({ enabled }) => enabled)).toHaveLength(3);
    expect(rulePackage.structures.filter(({ enabled }) => !enabled)).toEqual([
      expect.objectContaining({
        structureKey: 'seven-star-unrelated',
        supportStatus: 'NOT_SUPPORTED_IN_V0_1',
      }),
      expect.objectContaining({
        structureKey: 'all-unrelated',
        supportStatus: 'NOT_SUPPORTED_IN_V0_1',
      }),
      expect.objectContaining({
        structureKey: 'knitted-straight',
        supportStatus: 'NOT_SUPPORTED_IN_V0_1',
      }),
    ]);
  });

  it('contains the frozen tile, hand, scoring, legality, and source facts', () => {
    const rulePackage = parseRulePackageDefinition(commonSimpleRulePackageInput);
    const physicalTileCount = rulePackage.tileSet.enabledTiles.reduce(
      (total, tile) => total + (rulePackage.tileSet.maxCopies[tile] ?? 0),
      0,
    );

    expect(rulePackage.manifest).toMatchObject({
      ruleId: 'common-simple',
      ruleVersion: '1.0.0',
      displayName: '大众麻将·通用简化版',
      status: 'test',
    });
    expect(physicalTileCount).toBe(144);
    expect(rulePackage.handModel).toMatchObject({
      targetStructuralTileCount: 14,
      readyStructuralTileCount: 13,
      requiredMeldCount: 4,
      openKongPolicy: {
        distinction: 'undifferentiated',
        allowedKinds: ['direct', 'added'],
      },
    });
    expect(rulePackage.legality.minimumFan).toBe(0);
    expect(rulePackage.scoring.cap).toEqual({ enabled: false, value: null });
    expect(rulePackage.scoring.extras).toEqual([
      expect.objectContaining({ extraId: 'selfDraw', mode: 'ADD', value: 1 }),
      expect.objectContaining({ extraId: 'flowers', mode: 'ADD', value: 1 }),
    ]);
    expect(rulePackage.sources.map(({ sourceId }) => sourceId)).toEqual([
      'SRC-A01',
      'SRC-B01',
      'SRC-B02',
      'SRC-B03',
      'SRC-B04',
      'SRC-B05',
    ]);

    const serialized = JSON.stringify(rulePackage);
    expect(serialized).not.toMatch(
      /dealerMultiplier|roomMultiplier|postWinReveal|payment|payout|javascript:/u,
    );
  });
});
