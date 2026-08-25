import { describe, expect, it } from 'vitest';

import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import type { SystemEvaluation } from '../../domain/engine/evaluation';
import {
  filterEncyclopediaPatterns,
  getPatternCategory,
  getRecognizedPatternIds,
} from './encyclopedia-pattern-filter';

describe('T806 encyclopedia pattern filters', () => {
  it('combines alias, category, value, enabled, and current-recognition filters', () => {
    const patterns = [
      { ...commonSimpleRulePackage.patterns[0]!, aliases: ['四风齐刻'] },
      commonSimpleRulePackage.patterns.find(({ patternId }) => patternId === 'knittedStraight')!,
    ];

    expect(
      filterEncyclopediaPatterns(
        patterns,
        {
          query: '四风',
          category: getPatternCategory(patterns[0]!),
          minimumValue: 80,
          maximumValue: 90,
          enabled: 'enabled',
          currentRecognizedOnly: true,
        },
        new Set(['bigFourWinds']),
      ).map(({ patternId }) => patternId),
    ).toEqual(['bigFourWinds']);
  });

  it('derives current recognized patterns across every evaluated decomposition', () => {
    const evaluation = {
      status: 'legal-win',
      candidates: [
        { relation: { all: [{ candidate: { patternId: 'first' } }] } },
        { relation: { all: [{ candidate: { patternId: 'second' } }] } },
      ],
    } as unknown as SystemEvaluation;

    expect([...getRecognizedPatternIds(evaluation)]).toEqual(['first', 'second']);
    expect(getRecognizedPatternIds(null).size).toBe(0);
  });
});
