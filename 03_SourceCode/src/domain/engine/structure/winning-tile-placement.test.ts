import { describe, expect, it } from 'vitest';

import { createHandSnapshot } from '../../mahjong/hand';
import type { SevenPairsDecomposition } from './special-decomposition';
import type { StandardDecomposition } from './standard-decomposition';
import { placeWinningTile } from './winning-tile-placement';

describe('winning tile placement', () => {
  it('enumerates pair, sequence, and triplet meanings across complete decompositions', () => {
    const hand = createHandSnapshot({ winningTile: 'm3' });
    const pair: StandardDecomposition = {
      structureKey: 'standard-meld-pair',
      concealedMelds: [],
      pair: { kind: 'pair', tile: 'm3' },
      declaredMelds: [],
    };
    const sequenceAndTriplet: StandardDecomposition = {
      structureKey: 'standard-meld-pair',
      concealedMelds: [
        { kind: 'sequence', tiles: ['m1', 'm2', 'm3'] },
        { kind: 'sequence', tiles: ['m2', 'm3', 'm4'] },
        { kind: 'sequence', tiles: ['m3', 'm4', 'm5'] },
        { kind: 'triplet', tile: 'm3' },
      ],
      pair: { kind: 'pair', tile: 'east' },
      declaredMelds: [],
    };

    expect(
      placeWinningTile(hand, [pair, sequenceAndTriplet]).map(
        ({ winningTilePlacement }) => winningTilePlacement,
      ),
    ).toEqual([
      { kind: 'pair', tile: 'm3' },
      { kind: 'sequence', meldIndex: 0, tileIndex: 2 },
      { kind: 'sequence', meldIndex: 1, tileIndex: 1 },
      { kind: 'sequence', meldIndex: 2, tileIndex: 0 },
      { kind: 'triplet', meldIndex: 3 },
    ]);
  });

  it('deterministically deduplicates equivalent seven-pairs placements', () => {
    const hand = createHandSnapshot({ winningTile: 'm1' });
    const decomposition: SevenPairsDecomposition = {
      structureKey: 'seven-pairs',
      pairs: ['m1', 'm1', 'm2', 'p3', 's4', 'east', 'white'],
    };

    expect(placeWinningTile(hand, [decomposition])).toEqual([
      { decomposition, winningTilePlacement: { kind: 'seven-pairs-pair', pairIndex: 0 } },
    ]);
  });

  it('deduplicates equivalent identical sequence placements without losing distinct shapes', () => {
    const hand = createHandSnapshot({ winningTile: 'm3' });
    const decomposition: StandardDecomposition = {
      structureKey: 'standard-meld-pair',
      concealedMelds: [
        { kind: 'sequence', tiles: ['m1', 'm2', 'm3'] },
        { kind: 'sequence', tiles: ['m1', 'm2', 'm3'] },
        { kind: 'sequence', tiles: ['m2', 'm3', 'm4'] },
      ],
      pair: { kind: 'pair', tile: 'east' },
      declaredMelds: [],
    };

    expect(
      placeWinningTile(hand, [decomposition]).map(
        ({ winningTilePlacement }) => winningTilePlacement,
      ),
    ).toEqual([
      { kind: 'sequence', meldIndex: 0, tileIndex: 2 },
      { kind: 'sequence', meldIndex: 2, tileIndex: 1 },
    ]);
  });

  it('deduplicates equivalent decomposition inputs by canonical meaning', () => {
    const hand = createHandSnapshot({ winningTile: 'east' });
    const decomposition: StandardDecomposition = {
      structureKey: 'standard-meld-pair',
      concealedMelds: [{ kind: 'triplet', tile: 'm1' }],
      pair: { kind: 'pair', tile: 'east' },
      declaredMelds: [],
    };
    const equivalent: StandardDecomposition = {
      ...decomposition,
      concealedMelds: [...decomposition.concealedMelds].reverse(),
    };

    expect(placeWinningTile(hand, [decomposition, equivalent])).toEqual([
      { decomposition, winningTilePlacement: { kind: 'pair', tile: 'east' } },
    ]);
  });

  it('distinguishes thirteen-orphans pair and single completion semantics', () => {
    const requiredTiles = [
      'm1',
      'm9',
      'p1',
      'p9',
      's1',
      's9',
      'east',
      'south',
      'west',
      'north',
      'red',
      'green',
      'white',
    ] as const;
    const pairCompletion = {
      structureKey: 'thirteen-orphans' as const,
      requiredTiles,
      pairTile: 'east' as const,
    };
    const singleCompletion = { ...pairCompletion, pairTile: 'm1' as const };

    expect(placeWinningTile(createHandSnapshot({ winningTile: 'east' }), [pairCompletion])).toEqual(
      [
        {
          decomposition: pairCompletion,
          winningTilePlacement: { kind: 'thirteen-orphans-pair', tile: 'east' },
        },
      ],
    );
    expect(
      placeWinningTile(createHandSnapshot({ winningTile: 'east' }), [singleCompletion]),
    ).toEqual([
      {
        decomposition: singleCompletion,
        winningTilePlacement: { kind: 'thirteen-orphans-single', tile: 'east' },
      },
    ]);
  });

  it('does not invent a placement when winningTile is absent', () => {
    expect(placeWinningTile(createHandSnapshot(), [])).toEqual([]);
  });
});
