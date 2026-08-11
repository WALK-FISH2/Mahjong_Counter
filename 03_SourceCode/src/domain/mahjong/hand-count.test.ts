import { describe, expect, it } from 'vitest';

import { createHandSnapshot } from './hand';
import { countHandStructure } from './hand-count';
import { createChowMeld, createConcealedKongMeld, createPungMeld } from './meld';

describe('hand structure counts', () => {
  it('counts an ordinary hand without a rule-specific target', () => {
    const hand = createHandSnapshot({
      concealed: ['m1', 'm2', 'm3', 'p1'],
      melds: [createChowMeld('chow', ['s1', 's2', 's3']), createPungMeld('pung', 'east')],
      winningTile: 'p2',
    });

    expect(countHandStructure(hand)).toEqual({
      structuralTileCount: 11,
      physicalTileCount: 11,
    });
  });

  it('counts a kong as three structural tiles and four physical tiles', () => {
    const hand = createHandSnapshot({
      concealed: ['m1', 'm2'],
      melds: [createConcealedKongMeld('kong', 'red')],
      winningTile: 'm3',
    });

    expect(countHandStructure(hand)).toEqual({
      structuralTileCount: 6,
      physicalTileCount: 7,
    });
  });

  it('excludes flowers from structure while retaining actual physical input count', () => {
    const hand = createHandSnapshot({
      concealed: ['p1', 'p2'],
      flowers: ['spring', 'plum'],
      winningTile: 'p3',
    });

    expect(countHandStructure(hand)).toEqual({
      structuralTileCount: 3,
      physicalTileCount: 5,
    });
  });
});
