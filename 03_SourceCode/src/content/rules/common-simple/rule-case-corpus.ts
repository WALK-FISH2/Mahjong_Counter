import type { RuleRef } from '../../../domain/mahjong/calculator-document';

import {
  COMMON_SIMPLE_PATTERN_FACTS,
  COMMON_SIMPLE_UNSUPPORTED_PATTERN_FACTS,
} from './rule-package';

export const COMMON_SIMPLE_RULE_CASE_REF: RuleRef = Object.freeze({
  ruleId: 'common-simple',
  ruleVersion: '1.0.0',
});

export const COMMON_SIMPLE_RULE_CASE_SOURCE_REFS = Object.freeze(['SRC-A01']);

export type PatternRuleCaseMetadata = Readonly<{
  id: string;
  ruleRef: RuleRef;
  patternId: string;
  polarity: 'positive' | 'negative';
  sourceRefs: readonly string[];
}>;

export type RelationRuleCase = Readonly<{
  id: string;
  ruleRef: RuleRef;
  candidatePatternIds: readonly string[];
  expectedCountedPatternIds: readonly string[];
  sourceRefs: readonly string[];
}>;

export type UnsupportedStructureRuleCase = Readonly<{
  id: string;
  ruleRef: RuleRef;
  patternId: string;
  structureKey: string;
  expectedReasonCode: 'STRUCTURE_NOT_IMPLEMENTED';
  sourceRefs: readonly string[];
}>;

export const COMMON_SIMPLE_PATTERN_RULE_CASES = Object.freeze(
  COMMON_SIMPLE_PATTERN_FACTS.filter(([, , , enabled]) => enabled).flatMap(
    ([patternId]): readonly PatternRuleCaseMetadata[] => [
      Object.freeze({
        id: `pattern-${patternId}-positive`,
        ruleRef: COMMON_SIMPLE_RULE_CASE_REF,
        patternId,
        polarity: 'positive',
        sourceRefs: COMMON_SIMPLE_RULE_CASE_SOURCE_REFS,
      }),
      Object.freeze({
        id: `pattern-${patternId}-negative`,
        ruleRef: COMMON_SIMPLE_RULE_CASE_REF,
        patternId,
        polarity: 'negative',
        sourceRefs: COMMON_SIMPLE_RULE_CASE_SOURCE_REFS,
      }),
    ],
  ),
);

function relation(
  id: string,
  candidatePatternIds: readonly string[],
  expectedCountedPatternIds: readonly string[],
): RelationRuleCase {
  return Object.freeze({
    id,
    ruleRef: COMMON_SIMPLE_RULE_CASE_REF,
    candidatePatternIds: Object.freeze([...candidatePatternIds]),
    expectedCountedPatternIds: Object.freeze([...expectedCountedPatternIds]),
    sourceRefs: COMMON_SIMPLE_RULE_CASE_SOURCE_REFS,
  });
}

/** Rule Spec §12.4 regression matrix. The all-chows wait case is asserted at recognizer level. */
export const COMMON_SIMPLE_HIGH_RISK_RELATION_CASES = Object.freeze([
  relation(
    'relation-big-four-winds-chain',
    ['bigFourWinds', 'bigThreeWinds', 'prevalentWind', 'seatWind', 'allPungs'],
    ['bigFourWinds'],
  ),
  relation(
    'relation-big-three-dragons-chain',
    ['bigThreeDragons', 'twoDragonPungs', 'dragonPung'],
    ['bigThreeDragons'],
  ),
  relation(
    'relation-little-three-dragons-chain',
    ['littleThreeDragons', 'twoDragonPungs', 'dragonPung'],
    ['littleThreeDragons'],
  ),
  relation(
    'relation-four-kongs-chain',
    [
      'fourKongs',
      'threeKongs',
      'twoMeldedKongs',
      'twoConcealedKongs',
      'meldedKong',
      'concealedKong',
    ],
    ['fourKongs'],
  ),
  relation(
    'relation-seven-shifted-pairs-chain',
    ['sevenShiftedPairs', 'sevenPairs'],
    ['sevenShiftedPairs'],
  ),
  relation(
    'relation-thirteen-orphans-chain',
    ['thirteenOrphans', 'allTypes', 'concealedHand', 'singleWait'],
    ['thirteenOrphans'],
  ),
  relation(
    'relation-four-concealed-pungs-chain',
    ['fourConcealedPungs', 'threeConcealedPungs', 'twoConcealedPungs', 'allPungs'],
    ['fourConcealedPungs'],
  ),
  relation(
    'relation-pure-terminal-chows-chain',
    ['pureTerminalChows', 'fullFlush', 'allChows', 'twoTerminalChows', 'pureDoubleChow'],
    ['pureTerminalChows'],
  ),
  relation(
    'relation-quadruple-chow-chain',
    ['quadrupleChow', 'pureTripleChow', 'pureDoubleChow'],
    ['quadrupleChow'],
  ),
  relation(
    'relation-four-pure-shifted-pungs-chain',
    ['fourPureShiftedPungs', 'pureShiftedPungs', 'allPungs'],
    ['fourPureShiftedPungs'],
  ),
  relation(
    'relation-three-kongs-chain',
    ['threeKongs', 'twoMeldedKongs', 'twoConcealedKongs', 'meldedKong', 'concealedKong'],
    ['threeKongs'],
  ),
  relation(
    'relation-seven-pairs-chain',
    ['sevenPairs', 'concealedHand', 'singleWait'],
    ['sevenPairs'],
  ),
  relation('relation-full-flush-chain', ['fullFlush', 'oneVoidedSuit', 'noHonors'], ['fullFlush']),
  relation(
    'relation-all-even-pungs-chain',
    ['allEvenPungs', 'allPungs', 'allSimples'],
    ['allEvenPungs'],
  ),
  relation('relation-upper-tiles-chain', ['upperTiles', 'upperFour'], ['upperTiles']),
  relation('relation-middle-tiles-chain', ['middleTiles', 'allSimples'], ['middleTiles']),
  relation('relation-lower-tiles-chain', ['lowerTiles', 'lowerFour'], ['lowerTiles']),
  relation(
    'relation-fully-concealed-hand-chain',
    ['fullyConcealedHand', 'selfDrawn', 'concealedHand'],
    ['fullyConcealedHand'],
  ),
  relation(
    'relation-two-concealed-kongs-chain',
    ['twoConcealedKongs', 'concealedKong'],
    ['twoConcealedKongs'],
  ),
  relation('relation-two-melded-kongs-chain', ['twoMeldedKongs', 'meldedKong'], ['twoMeldedKongs']),
  relation('relation-two-dragon-pungs-chain', ['twoDragonPungs', 'dragonPung'], ['twoDragonPungs']),
  relation('relation-single-wait-mutex', ['edgeWait', 'closedWait', 'singleWait'], ['singleWait']),
  relation('relation-chicken-hand-fallback', ['chickenHand', 'allChows'], ['allChows']),
  relation('relation-all-chows-wait-definition', ['allChows'], []),
]);

export const COMMON_SIMPLE_UNSUPPORTED_STRUCTURE_RULE_CASES = Object.freeze(
  Object.entries(COMMON_SIMPLE_UNSUPPORTED_PATTERN_FACTS).map(
    ([patternId, structureKey]): UnsupportedStructureRuleCase =>
      Object.freeze({
        id: `unsupported-${patternId}`,
        ruleRef: COMMON_SIMPLE_RULE_CASE_REF,
        patternId,
        structureKey,
        expectedReasonCode: 'STRUCTURE_NOT_IMPLEMENTED',
        sourceRefs: COMMON_SIMPLE_RULE_CASE_SOURCE_REFS,
      }),
  ),
);
