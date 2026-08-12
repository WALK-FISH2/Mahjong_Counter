import { describe, expect, it } from 'vitest';

import type { PatternDefinition } from '../../rules/pattern-definition';
import {
  additiveScoringStrategy,
  createScoringStrategyRegistry,
  scoreResolvedPatterns,
  ScoringStrategyUnavailableError,
} from './scoring-strategy';

const patterns: readonly PatternDefinition[] = [
  {
    patternId: 'one',
    name: 'One',
    recognizerKey: 'recognizer.one',
    value: 2,
    unit: 'fan',
    enabled: true,
    sourceRefs: ['source'],
  },
  {
    patternId: 'repeat',
    name: 'Repeat',
    recognizerKey: 'recognizer.repeat',
    value: 1,
    unit: 'fan',
    enabled: true,
    sourceRefs: ['source'],
  },
];
const counted = patterns.map((pattern, index) => ({
  candidate: {
    patternId: pattern.patternId,
    recognizerKey: pattern.recognizerKey,
    occurrences: index + 1,
    evidence: [{ evidenceType: 'fixture', facts: {} }],
  },
  status: 'COUNTED' as const,
  reason: 'COUNTED' as const,
}));

describe('Scoring Strategy', () => {
  it('adds counted occurrences in the native rule unit without applying future cap or extras', () => {
    const score = scoreResolvedPatterns(
      {
        strategyKey: 'scoring.additive',
        unit: 'fan',
        parameters: {},
        cap: { enabled: true, value: 1 },
        extras: [],
      },
      patterns,
      counted,
      createScoringStrategyRegistry([additiveScoringStrategy]),
    );
    expect(score).toEqual({
      strategyKey: 'scoring.additive',
      unit: 'fan',
      total: 4,
      items: [
        { patternId: 'one', occurrences: 1, unitValue: 2, subtotal: 2, unit: 'fan' },
        { patternId: 'repeat', occurrences: 2, unitValue: 1, subtotal: 2, unit: 'fan' },
      ],
    });
  });

  it('leaves patterns delegated to scoring extras for the later Cap / Extra stage', () => {
    const score = scoreResolvedPatterns(
      {
        strategyKey: 'scoring.additive',
        unit: 'fan',
        parameters: {},
        extras: [
          {
            extraId: 'repeat-extra',
            calculatorKey: 'scoring.extra.fixture',
            parameters: { patternId: 'repeat' },
            mode: 'ADD',
            value: 1,
            capPlacement: 'after-cap',
          },
        ],
      },
      patterns,
      counted,
      createScoringStrategyRegistry([additiveScoringStrategy]),
    );

    expect(score.total).toBe(2);
    expect(score.items.map(({ patternId }) => patternId)).toEqual(['one']);
  });

  it('fails closed for unknown strategy keys or incompatible units', () => {
    expect(() =>
      scoreResolvedPatterns(
        { strategyKey: 'missing', unit: 'fan', parameters: {} },
        patterns,
        counted,
        createScoringStrategyRegistry([additiveScoringStrategy]),
      ),
    ).toThrow(ScoringStrategyUnavailableError);
    expect(() =>
      scoreResolvedPatterns(
        { strategyKey: 'scoring.additive', unit: 'points', parameters: {} },
        patterns,
        counted,
        createScoringStrategyRegistry([additiveScoringStrategy]),
      ),
    ).toThrow(TypeError);
  });
});
