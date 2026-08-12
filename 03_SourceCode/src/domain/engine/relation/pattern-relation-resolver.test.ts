import { describe, expect, it } from 'vitest';

import type { PatternDefinition } from '../../rules/pattern-definition';
import type { PatternCandidate } from '../pattern/pattern-recognizer';
import { resolvePatternRelations } from './pattern-relation-resolver';

function definition(patternId: string, value: number): PatternDefinition {
  return {
    patternId,
    name: patternId,
    recognizerKey: `recognizer.${patternId}`,
    value,
    unit: 'fan',
    enabled: true,
    sourceRefs: ['source'],
  };
}
function candidate(patternId: string, evidenceType = 'fixture'): PatternCandidate {
  return {
    patternId,
    recognizerKey: `recognizer.${patternId}`,
    occurrences: 1,
    evidence: [{ evidenceType, facts: {} }],
  };
}

describe('Pattern Relation Resolver', () => {
  it('applies covers and retains an explainable exclusion reason', () => {
    const result = resolvePatternRelations(
      [candidate('big'), candidate('small')],
      [definition('big', 8), definition('small', 1)],
      [{ type: 'covers', winner: 'big', covered: 'small' }],
    );
    expect(result.counted.map(({ candidate: item }) => item.patternId)).toEqual(['big']);
    expect(result.excluded[0]).toMatchObject({
      reason: 'COVERED',
      excludedByPatternId: 'big',
      relationType: 'covers',
    });
  });

  it('resolves mutex and non-repeat groups deterministically', () => {
    const result = resolvePatternRelations(
      [candidate('edge'), candidate('single'), candidate('repeatLow'), candidate('repeatHigh')],
      [
        definition('edge', 1),
        definition('single', 1),
        definition('repeatLow', 1),
        definition('repeatHigh', 2),
      ],
      [
        {
          type: 'mutually-exclusive',
          patterns: ['edge', 'single'],
          resolution: 'explicit-priority',
          priority: ['single', 'edge'],
        },
        {
          type: 'non-repeat-group',
          groupId: 'repeat',
          patterns: ['repeatLow', 'repeatHigh'],
          resolution: 'highest-value',
        },
      ],
    );
    expect(result.counted.map(({ candidate: item }) => item.patternId)).toEqual([
      'single',
      'repeatHigh',
    ]);
    expect(result.excluded.map(({ reason }) => reason)).toEqual(['MUTEX', 'HIGHER_SELECTED']);
  });

  it('excludes chicken hand whenever a non-flower pattern survives', () => {
    const result = resolvePatternRelations(
      [
        candidate('chickenHand', 'fallback-if-no-other'),
        candidate('flowerTiles', 'fallback-ignored-extra'),
        candidate('allChows'),
      ],
      [definition('chickenHand', 8), definition('flowerTiles', 1), definition('allChows', 2)],
      [],
    );
    expect(
      result.excluded.find(({ candidate: item }) => item.patternId === 'chickenHand'),
    ).toMatchObject({ reason: 'FALLBACK_NOT_APPLICABLE', excludedByPatternId: 'allChows' });
  });

  it('keeps a fallback candidate when only explicitly ignored extras remain', () => {
    const result = resolvePatternRelations(
      [
        candidate('fallback', 'fallback-if-no-other'),
        candidate('flowers', 'fallback-ignored-extra'),
      ],
      [definition('fallback', 8), definition('flowers', 1)],
      [],
    );

    expect(result.counted.map(({ candidate: item }) => item.patternId)).toEqual([
      'fallback',
      'flowers',
    ]);
  });

  it('keeps covers transitive when an intermediate pattern was already excluded', () => {
    const result = resolvePatternRelations(
      [candidate('top'), candidate('middle'), candidate('low')],
      [definition('top', 8), definition('middle', 4), definition('low', 1)],
      [
        { type: 'covers', winner: 'top', covered: 'middle' },
        { type: 'covers', winner: 'middle', covered: 'low' },
      ],
    );

    expect(result.counted.map(({ candidate: item }) => item.patternId)).toEqual(['top']);
    expect(result.excluded.map(({ candidate: item }) => item.patternId)).toEqual(['middle', 'low']);
  });

  it('enforces non-repeat without assuming unrelated Pattern IDs share a group', () => {
    const result = resolvePatternRelations(
      [candidate('occurrenceOne'), candidate('occurrenceTwo')],
      [definition('occurrenceOne', 1), definition('occurrenceTwo', 1)],
      [
        {
          type: 'non-repeat-group',
          groupId: 'same-set',
          patterns: ['occurrenceOne', 'occurrenceTwo'],
          resolution: 'explicit-priority',
          priority: ['occurrenceOne', 'occurrenceTwo'],
        },
      ],
    );

    expect(result.counted.map(({ candidate: item }) => item.patternId)).toEqual(['occurrenceOne']);
    expect(result.excluded[0]).toMatchObject({
      reason: 'NON_REPEAT',
      excludedByPatternId: 'occurrenceOne',
      relationType: 'non-repeat-group',
    });
  });
});
