import {
  COMMON_SIMPLE_HIGH_RISK_RELATION_CASES,
  COMMON_SIMPLE_PATTERN_RULE_CASES,
  COMMON_SIMPLE_UNSUPPORTED_STRUCTURE_RULE_CASES,
} from './rule-case-corpus';

export const commonSimpleRuleCorpusIndexInput: unknown = {
  ruleId: 'common-simple',
  ruleVersion: '1.0.0',
  cases: [
    { caseId: 'structure-standard-positive', kind: 'structure' },
    { caseId: 'structure-standard-negative', kind: 'structure' },
    { caseId: 'structure-seven-pairs-positive', kind: 'structure' },
    { caseId: 'structure-seven-pairs-negative', kind: 'structure' },
    { caseId: 'structure-thirteen-orphans-positive', kind: 'structure' },
    { caseId: 'structure-thirteen-orphans-negative', kind: 'structure' },
    { caseId: 'structure-multiple-types-positive', kind: 'structure' },
    { caseId: 'structure-multiple-decompositions-positive', kind: 'structure' },
    { caseId: 'structure-multiple-decompositions-negative', kind: 'structure' },
    { caseId: 'structure-declared-chow-positive', kind: 'structure' },
    { caseId: 'structure-declared-kong-positive', kind: 'structure' },
    { caseId: 'structure-winning-placement-positive', kind: 'structure' },
    ...COMMON_SIMPLE_PATTERN_RULE_CASES.map(({ id, patternId, polarity }) => ({
      caseId: id,
      patternId,
      kind: polarity,
    })),
    ...COMMON_SIMPLE_HIGH_RISK_RELATION_CASES.map(({ id }) => ({
      caseId: id,
      kind: 'relation',
    })),
    ...COMMON_SIMPLE_UNSUPPORTED_STRUCTURE_RULE_CASES.map(({ id, patternId }) => ({
      caseId: id,
      patternId,
      kind: 'structure',
    })),
  ],
};
