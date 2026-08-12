import { describe, expect, it } from 'vitest';

import { createHandSnapshot } from '../../mahjong/hand';
import {
  createChowMeld,
  createConcealedKongMeld,
  createOpenKongMeld,
  createPungMeld,
  type Meld,
} from '../../mahjong/meld';
import type { TileCode } from '../../mahjong/tile';
import type { HandModelDefinition } from '../../rules/hand-model';
import {
  deduplicateStandardDecompositions,
  enumerateStandardDecompositions,
  getStandardDecompositionKey,
  inspectStandardDecompositionSearch,
  type StandardDecomposition,
} from './standard-decomposition';

const STANDARD_HAND_MODEL: HandModelDefinition = Object.freeze({
  targetStructuralTileCount: 14,
  readyStructuralTileCount: 13,
  requiredMeldCount: 4,
  allowedMeldTypes: Object.freeze(['chow', 'pung', 'open-kong', 'concealed-kong'] as const),
  openKongPolicy: Object.freeze({
    distinction: 'undifferentiated',
    allowedKinds: Object.freeze(['direct', 'added'] as const),
  }),
  maxDeclaredMelds: 4,
  flowerPolicy: 'separate',
});

function createWinningHand(
  concealed: readonly TileCode[],
  winningTile: TileCode,
  melds: readonly Meld[] = [],
) {
  return createHandSnapshot({ concealed, winningTile, melds });
}

describe('standard structure DFS', () => {
  it('returns the only legal decomposition for a single-solution hand', () => {
    const hand = createWinningHand(
      ['m1', 'm2', 'm3', 'p1', 'p2', 'p3', 's1', 's2', 's3', 'east', 'east', 'east', 'white'],
      'white',
    );
    const decompositions = enumerateStandardDecompositions({
      hand,
      handModel: STANDARD_HAND_MODEL,
    });

    expect(decompositions).toHaveLength(1);
    expect(decompositions[0]).toMatchObject({
      structureKey: 'standard-meld-pair',
      pair: { kind: 'pair', tile: 'white' },
    });
    expect(decompositions[0]?.concealedMelds).toHaveLength(4);
  });

  it('enumerates every distinct decomposition instead of stopping at the first solution', () => {
    const hand = createWinningHand(
      ['m1', 'm1', 'm1', 'm2', 'm2', 'm2', 'm3', 'm3', 'm3', 'm4', 'm4', 'm4', 'm5'],
      'm5',
    );
    const decompositions = enumerateStandardDecompositions({
      hand,
      handModel: STANDARD_HAND_MODEL,
    });
    const keys = decompositions.map(getStandardDecompositionKey);

    expect(decompositions.length).toBeGreaterThan(1);
    expect(new Set(keys).size).toBe(decompositions.length);
    expect(
      decompositions.some((decomposition) =>
        decomposition.concealedMelds.every((meld) => meld.kind === 'triplet'),
      ),
    ).toBe(true);
    expect(
      decompositions.some((decomposition) =>
        decomposition.concealedMelds.some((meld) => meld.kind === 'sequence'),
      ),
    ).toBe(true);
  });

  it('returns no decomposition for a structurally unsatisfied hand', () => {
    const hand = createWinningHand(
      ['m1', 'm2', 'm3', 'p1', 'p2', 'p3', 's1', 's2', 's3', 'east', 'east', 'east', 'white'],
      'green',
    );

    expect(enumerateStandardDecompositions({ hand, handModel: STANDARD_HAND_MODEL })).toEqual([]);
  });

  it('can detect a complete concealed structure without inventing a winning tile placement', () => {
    const hand = createHandSnapshot({
      concealed: [
        'm1',
        'm2',
        'm3',
        'p1',
        'p2',
        'p3',
        's1',
        's2',
        's3',
        'east',
        'east',
        'east',
        'white',
        'white',
      ],
    });
    const decompositions = enumerateStandardDecompositions({
      hand,
      handModel: STANDARD_HAND_MODEL,
    });

    expect(decompositions).toHaveLength(1);
    expect(hand.winningTile).toBeNull();
    expect(decompositions[0]).not.toHaveProperty('winningTilePlacement');
  });

  it('derives target and meld counts from HandModelDefinition instead of fixing 14 and 4', () => {
    const compactModel: HandModelDefinition = Object.freeze({
      targetStructuralTileCount: 5,
      readyStructuralTileCount: 4,
      requiredMeldCount: 1,
      allowedMeldTypes: Object.freeze(['chow', 'pung'] as const),
      openKongPolicy: Object.freeze({
        distinction: 'undifferentiated',
        allowedKinds: Object.freeze([]),
      }),
      maxDeclaredMelds: 1,
      flowerPolicy: 'none',
    });
    const hand = createWinningHand(['m1', 'm2', 'm3', 'east'], 'east');

    expect(enumerateStandardDecompositions({ hand, handModel: compactModel })).toHaveLength(1);
    expect(
      enumerateStandardDecompositions({
        hand,
        handModel: { ...compactModel, targetStructuralTileCount: 6 },
      }),
    ).toEqual([]);
  });

  it('does not confuse declared action availability with concealed sequence structure', () => {
    const hand = createWinningHand(['m1', 'm2', 'm3', 'east'], 'east');
    const tripletsOnly: HandModelDefinition = {
      targetStructuralTileCount: 5,
      readyStructuralTileCount: 4,
      requiredMeldCount: 1,
      allowedMeldTypes: ['pung'],
      openKongPolicy: { distinction: 'undifferentiated', allowedKinds: [] },
      maxDeclaredMelds: 1,
      flowerPolicy: 'none',
    };

    expect(enumerateStandardDecompositions({ hand, handModel: tripletsOnly })).toHaveLength(1);
  });
});

describe('standard structure memoization and canonical deduplication', () => {
  const repeatedStateHand = createWinningHand(
    ['m1', 'm1', 'm1', 'm1', 'm2', 'm2', 'm2', 'm2', 'm3', 'm3', 'm3', 'm3', 'm4'],
    'm4',
  );

  it('keeps memoized and uncached results identical while expanding fewer states', () => {
    const memoized = inspectStandardDecompositionSearch(
      { hand: repeatedStateHand, handModel: STANDARD_HAND_MODEL },
      { memoization: true },
    );
    const uncached = inspectStandardDecompositionSearch(
      { hand: repeatedStateHand, handModel: STANDARD_HAND_MODEL },
      { memoization: false },
    );

    expect(memoized.decompositions).toEqual(uncached.decompositions);
    expect(memoized.diagnostics.memoHits).toBeGreaterThan(0);
    expect(memoized.diagnostics.expandedStates).toBeLessThan(uncached.diagnostics.expandedStates);
  });

  it('collapses equivalent paths after canonicalizing concealed meld order', () => {
    const result = inspectStandardDecompositionSearch({
      hand: repeatedStateHand,
      handModel: STANDARD_HAND_MODEL,
    });

    expect(result.diagnostics.duplicateCandidatesRemoved).toBeGreaterThan(0);
    expect(new Set(result.decompositions.map(getStandardDecompositionKey)).size).toBe(
      result.decompositions.length,
    );

    const first = result.decompositions[0]!;
    const reversed: StandardDecomposition = {
      ...first,
      concealedMelds: [...first.concealedMelds].reverse(),
    };

    expect(deduplicateStandardDecompositions([first, reversed])).toHaveLength(1);
  });
});

describe('declared meld integration', () => {
  const concealed: readonly TileCode[] = [
    'p1',
    'p2',
    'p3',
    's1',
    's2',
    's3',
    'east',
    'east',
    'east',
    'white',
  ];
  const cases: readonly Readonly<{ label: string; meld: Meld }>[] = [
    { label: 'chow', meld: createChowMeld('declared-chow', ['m1', 'm2', 'm3']) },
    { label: 'pung', meld: createPungMeld('declared-pung', 'red') },
    { label: 'open kong', meld: createOpenKongMeld('declared-open-kong', 'red', 'direct') },
    { label: 'concealed kong', meld: createConcealedKongMeld('declared-concealed-kong', 'red') },
  ];

  it.each(cases)('keeps a declared $label fixed and out of concealed DFS', ({ meld }) => {
    const hand = createWinningHand(concealed, 'white', [meld]);
    const before = JSON.stringify(hand);
    const decompositions = enumerateStandardDecompositions({
      hand,
      handModel: STANDARD_HAND_MODEL,
    });

    expect(decompositions).toHaveLength(1);
    expect(decompositions[0]?.declaredMelds).toEqual([meld]);
    expect(decompositions[0]?.declaredMelds[0]).toBe(meld);
    expect(decompositions[0]?.concealedMelds).toHaveLength(3);
    expect(JSON.stringify(hand)).toBe(before);
  });

  it('rejects declared melds beyond rule-driven limits or allowed types', () => {
    const meld = createChowMeld('declared-chow', ['m1', 'm2', 'm3']);
    const hand = createWinningHand(concealed, 'white', [meld]);

    expect(
      enumerateStandardDecompositions({
        hand,
        handModel: { ...STANDARD_HAND_MODEL, maxDeclaredMelds: 0 },
      }),
    ).toEqual([]);
    expect(
      enumerateStandardDecompositions({
        hand,
        handModel: {
          ...STANDARD_HAND_MODEL,
          allowedMeldTypes: ['pung'],
          openKongPolicy: { distinction: 'undifferentiated', allowedKinds: [] },
        },
      }),
    ).toEqual([]);
  });
});
