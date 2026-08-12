import { describe, expect, it } from 'vitest';

import { commonSimplePatternRecognizerRegistry } from '../../../content/rules/common-simple/pattern-recognizers';
import {
  COMMON_SIMPLE_HIGH_RISK_RELATION_CASES,
  COMMON_SIMPLE_PATTERN_RULE_CASES,
  COMMON_SIMPLE_RULE_CASE_REF,
  COMMON_SIMPLE_UNSUPPORTED_STRUCTURE_RULE_CASES,
} from '../../../content/rules/common-simple/rule-case-corpus';
import { commonSimpleRuleCorpusIndexInput } from '../../../content/rules/common-simple/rule-corpus-index';
import { commonSimpleRulePackageInput } from '../../../content/rules/common-simple/rule-package';
import {
  recognizePlacedCandidates,
  type PatternCandidate,
} from '../../../domain/engine/pattern/pattern-recognizer';
import { resolvePatternRelations } from '../../../domain/engine/relation/pattern-relation-resolver';
import { enumerateWinningDecompositions } from '../../../domain/engine/structure/structure-engine';
import { placeWinningTile } from '../../../domain/engine/structure/winning-tile-placement';
import { createWinContext } from '../../../domain/mahjong/context';
import { createHandSnapshot } from '../../../domain/mahjong/hand';
import { parseRuleCorpusIndex } from '../../../schemas/rule-package/rule-corpus-index-schema';
import { parseRulePackageDefinition } from '../../../schemas/rule-package/rule-package-definition-schema';

const rule = parseRulePackageDefinition(commonSimpleRulePackageInput);
const corpusIndex = parseRuleCorpusIndex(commonSimpleRuleCorpusIndexInput);

function candidate(patternId: string): PatternCandidate {
  return Object.freeze({
    patternId,
    recognizerKey: `recognizer.${patternId}`,
    occurrences: 1,
    evidence: Object.freeze([
      Object.freeze({
        evidenceType: patternId === 'chickenHand' ? 'fallback-if-no-other' : 'rule-case-fixture',
        facts: Object.freeze({}),
      }),
    ]),
  });
}

function placedCandidates() {
  const hand = createHandSnapshot({
    concealed: ['m1', 'm2', 'p1', 'p2', 'p3', 's1', 's2', 's3', 'm4', 'm5', 'm6', 'p5', 'p5'],
    winningTile: 'm3',
  });
  const structure = enumerateWinningDecompositions({
    hand,
    handModel: rule.handModel,
    structures: rule.structures,
  });
  return {
    hand,
    candidates: placeWinningTile(hand, structure.decompositions),
  };
}

describe('common-simple M4 Rule Case Corpus', () => {
  it('records a versioned, sourced positive and key negative fixture for all 78 enabled patterns', () => {
    const indexedIds = new Set(corpusIndex.cases.map(({ caseId }) => caseId));
    const enabledIds = rule.patterns
      .filter(({ enabled }) => enabled)
      .map(({ patternId }) => patternId);

    expect(enabledIds).toHaveLength(78);
    expect(COMMON_SIMPLE_PATTERN_RULE_CASES).toHaveLength(156);
    for (const patternId of enabledIds) {
      const cases = COMMON_SIMPLE_PATTERN_RULE_CASES.filter(
        (ruleCase) => ruleCase.patternId === patternId,
      );
      expect(cases.map(({ polarity }) => polarity).sort()).toEqual(['negative', 'positive']);
      for (const ruleCase of cases) {
        expect(ruleCase.ruleRef).toEqual(COMMON_SIMPLE_RULE_CASE_REF);
        expect(ruleCase.sourceRefs).toEqual(['SRC-A01']);
        expect(indexedIds.has(ruleCase.id)).toBe(true);
      }
    }
  });

  it.each(
    COMMON_SIMPLE_HIGH_RISK_RELATION_CASES.filter(
      ({ id }) => id !== 'relation-all-chows-wait-definition',
    ),
  )('$id resolves the Rule Spec §12 high-risk relation deterministically', (ruleCase) => {
    const result = resolvePatternRelations(
      ruleCase.candidatePatternIds.map(candidate),
      rule.patterns,
      rule.relations,
    );

    expect(result.counted.map(({ candidate: item }) => item.patternId).sort()).toEqual(
      [...ruleCase.expectedCountedPatternIds].sort(),
    );
  });

  it('does not count All Chows when the winning placement establishes a single wait type', () => {
    const { hand, candidates } = placedCandidates();
    const recognized = recognizePlacedCandidates(
      hand,
      createWinContext('discard'),
      candidates,
      rule.patterns,
      rule.structures,
      commonSimplePatternRecognizerRegistry,
    );

    expect(candidates.length).toBeGreaterThan(0);
    expect(
      recognized.every(({ recognition }) =>
        recognition.candidates.every(({ patternId }) => patternId !== 'allChows'),
      ),
    ).toBe(true);
  });

  it('returns unsupported structure for all three disabled special structures', () => {
    const { hand, candidates } = placedCandidates();
    const recognized = recognizePlacedCandidates(
      hand,
      createWinContext('discard'),
      candidates,
      rule.patterns,
      rule.structures,
      commonSimplePatternRecognizerRegistry,
    );
    const expected = COMMON_SIMPLE_UNSUPPORTED_STRUCTURE_RULE_CASES.map((ruleCase) => ({
      patternId: ruleCase.patternId,
      reasonCode: ruleCase.expectedReasonCode,
      structureKey: ruleCase.structureKey,
    })).sort((left, right) => left.patternId.localeCompare(right.patternId));

    expect(COMMON_SIMPLE_UNSUPPORTED_STRUCTURE_RULE_CASES).toHaveLength(3);
    expect(
      [...recognized[0]!.recognition.unsupportedPatterns].sort((left, right) =>
        left.patternId.localeCompare(right.patternId),
      ),
    ).toEqual(expected);
  });

  it('keeps every relation and unsupported fixture versioned, sourced, and indexed', () => {
    const indexedIds = new Set(corpusIndex.cases.map(({ caseId }) => caseId));
    for (const ruleCase of [
      ...COMMON_SIMPLE_HIGH_RISK_RELATION_CASES,
      ...COMMON_SIMPLE_UNSUPPORTED_STRUCTURE_RULE_CASES,
    ]) {
      expect(ruleCase.ruleRef).toEqual(COMMON_SIMPLE_RULE_CASE_REF);
      expect(ruleCase.sourceRefs.length).toBeGreaterThan(0);
      expect(indexedIds.has(ruleCase.id)).toBe(true);
    }
  });
});
