import { describe, expect, it } from 'vitest';

import {
  parsePatternRelationsWithPatterns,
  patternRelationsWithPatternsSchema,
} from './pattern-relation-schema';

function pattern(patternId: string, value: number) {
  return {
    patternId,
    name: patternId,
    recognizerKey: `recognizer.${patternId}`,
    value,
    unit: 'fan',
    enabled: true,
    sourceRefs: ['fixture-source'],
  } as const;
}

const patterns = [pattern('highPattern', 8), pattern('middlePattern', 4), pattern('lowPattern', 2)];

describe('PatternRelation schema validation', () => {
  it('supports covers, mutually-exclusive, and non-repeat-group relations', () => {
    const parsed = parsePatternRelationsWithPatterns({
      patterns,
      relations: [
        { type: 'covers', winner: 'highPattern', covered: 'middlePattern' },
        {
          type: 'mutually-exclusive',
          patterns: ['middlePattern', 'lowPattern'],
          resolution: 'explicit-priority',
          priority: ['middlePattern', 'lowPattern'],
        },
        {
          type: 'non-repeat-group',
          groupId: 'fixture-group',
          patterns: ['highPattern', 'lowPattern'],
          resolution: 'highest-value',
        },
      ],
    });

    expect(parsed.relations.map(({ type }) => type)).toEqual([
      'covers',
      'mutually-exclusive',
      'non-repeat-group',
    ]);
  });

  it('rejects unknown relation members and invalid explicit priority', () => {
    expect(
      patternRelationsWithPatternsSchema.safeParse({
        patterns,
        relations: [{ type: 'covers', winner: 'highPattern', covered: 'missingPattern' }],
      }).success,
    ).toBe(false);
    expect(
      patternRelationsWithPatternsSchema.safeParse({
        patterns,
        relations: [
          {
            type: 'mutually-exclusive',
            patterns: ['middlePattern', 'lowPattern'],
            resolution: 'explicit-priority',
            priority: ['middlePattern'],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('rejects direct and transitive covers cycles', () => {
    expect(
      patternRelationsWithPatternsSchema.safeParse({
        patterns,
        relations: [{ type: 'covers', winner: 'highPattern', covered: 'highPattern' }],
      }).success,
    ).toBe(false);
    expect(
      patternRelationsWithPatternsSchema.safeParse({
        patterns,
        relations: [
          { type: 'covers', winner: 'highPattern', covered: 'middlePattern' },
          { type: 'covers', winner: 'middlePattern', covered: 'lowPattern' },
          { type: 'covers', winner: 'lowPattern', covered: 'highPattern' },
        ],
      }).success,
    ).toBe(false);
  });

  it('rejects duplicate relations and duplicate non-repeat group IDs', () => {
    const covers = { type: 'covers', winner: 'highPattern', covered: 'middlePattern' } as const;
    expect(
      patternRelationsWithPatternsSchema.safeParse({
        patterns,
        relations: [covers, covers],
      }).success,
    ).toBe(false);
    expect(
      patternRelationsWithPatternsSchema.safeParse({
        patterns,
        relations: [
          {
            type: 'non-repeat-group',
            groupId: 'duplicate-group',
            patterns: ['highPattern', 'middlePattern'],
            resolution: 'highest-value',
          },
          {
            type: 'non-repeat-group',
            groupId: 'duplicate-group',
            patterns: ['middlePattern', 'lowPattern'],
            resolution: 'highest-value',
          },
        ],
      }).success,
    ).toBe(false);
  });
});
