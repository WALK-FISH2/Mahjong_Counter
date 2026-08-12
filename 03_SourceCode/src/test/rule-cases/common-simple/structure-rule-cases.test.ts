import { describe, expect, it } from 'vitest';

import { commonSimpleRuleCorpusIndexInput } from '../../../content/rules/common-simple/rule-corpus-index';
import { commonSimpleRulePackageInput } from '../../../content/rules/common-simple/rule-package';
import { enumerateWinningDecompositions } from '../../../domain/engine/structure/structure-engine';
import { placeWinningTile } from '../../../domain/engine/structure/winning-tile-placement';
import { createHandSnapshot } from '../../../domain/mahjong/hand';
import { parseRuleCorpusIndex } from '../../../schemas/rule-package/rule-corpus-index-schema';
import { parseRulePackageDefinition } from '../../../schemas/rule-package/rule-package-definition-schema';
import { COMMON_SIMPLE_STRUCTURE_RULE_CASES } from './structure-rule-cases';

const rulePackage = parseRulePackageDefinition(commonSimpleRulePackageInput);
const corpusIndex = parseRuleCorpusIndex(commonSimpleRuleCorpusIndexInput);

describe('common-simple Structure Rule Test Corpus', () => {
  it('keeps every executable case traceable to the corpus index and active RulePackage', () => {
    const indexedCaseIds = new Set(corpusIndex.cases.map(({ caseId }) => caseId));

    expect(corpusIndex.ruleId).toBe(rulePackage.manifest.ruleId);
    expect(corpusIndex.ruleVersion).toBe(rulePackage.manifest.ruleVersion);
    expect(COMMON_SIMPLE_STRUCTURE_RULE_CASES.map(({ id }) => id)).toEqual(
      corpusIndex.cases.map(({ caseId }) => caseId),
    );

    for (const ruleCase of COMMON_SIMPLE_STRUCTURE_RULE_CASES) {
      expect(indexedCaseIds.has(ruleCase.id)).toBe(true);
      expect(ruleCase.ruleRef).toEqual({
        ruleId: rulePackage.manifest.ruleId,
        ruleVersion: rulePackage.manifest.ruleVersion,
      });
      expect(ruleCase.sourceRefs.length).toBeGreaterThan(0);
    }
  });

  it.each(COMMON_SIMPLE_STRUCTURE_RULE_CASES)('$id — $title', (ruleCase) => {
    const hand = createHandSnapshot(ruleCase.calculator.hand);
    const result = enumerateWinningDecompositions({
      hand,
      handModel: rulePackage.handModel,
      structures: rulePackage.structures,
    });
    const structureKeys = [
      ...new Set(result.decompositions.map(({ structureKey }) => structureKey)),
    ];
    const placements = placeWinningTile(hand, result.decompositions);

    expect(result.decompositions.length > 0 ? 'STRUCTURAL_WIN' : 'NOT_WINNING').toBe(
      ruleCase.expected.status,
    );
    expect(new Set(structureKeys)).toEqual(new Set(ruleCase.expected.structureKeys));

    if (ruleCase.expected.minimumDecompositionCount !== undefined) {
      expect(result.decompositions.length).toBeGreaterThanOrEqual(
        ruleCase.expected.minimumDecompositionCount,
      );
    }
    if (ruleCase.expected.minimumWinningTilePlacementCount !== undefined) {
      expect(placements.length).toBeGreaterThanOrEqual(
        ruleCase.expected.minimumWinningTilePlacementCount,
      );
    }
  });
});
