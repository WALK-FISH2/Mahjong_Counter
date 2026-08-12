import { describe, expect, it } from 'vitest';

import { createWinContext } from '../../mahjong/context';
import { createHandSnapshot } from '../../mahjong/hand';
import { createOpenKongMeld, createPungMeld } from '../../mahjong/meld';
import type { PlacedWinningDecomposition } from '../structure/winning-tile-placement';
import { deriveFacts } from './derived-facts';

describe('DerivedFacts', () => {
  it('derives shared suit, honor, meld, kong, exposure, wait, and flower facts once', () => {
    const hand = createHandSnapshot({
      concealed: ['m1', 'm2', 'm4', 'm5', 'm6', 'red'],
      melds: [createPungMeld('east', 'east'), createOpenKongMeld('m9', 'm9')],
      flowers: ['spring'],
      winningTile: 'm3',
    });
    const placed: PlacedWinningDecomposition = {
      decomposition: {
        structureKey: 'standard-meld-pair',
        concealedMelds: [
          { kind: 'sequence', tiles: ['m1', 'm2', 'm3'] },
          { kind: 'sequence', tiles: ['m4', 'm5', 'm6'] },
        ],
        pair: { kind: 'pair', tile: 'red' },
        declaredMelds: hand.melds,
      },
      winningTilePlacement: { kind: 'sequence', meldIndex: 0, tileIndex: 2 },
    };

    const facts = deriveFacts(hand, createWinContext('discard'), placed);

    expect(facts.suits).toEqual(['characters']);
    expect(facts.hasHonors).toBe(true);
    expect(facts.sequences).toHaveLength(2);
    expect(facts.pungLikeMelds).toHaveLength(2);
    expect(facts.kongs).toHaveLength(1);
    expect(facts.openDeclaredMeldCount).toBe(2);
    expect(facts.isConcealedHand).toBe(false);
    expect(facts.waitKind).toBe('edge');
    expect(facts.flowerCount).toBe(1);
  });

  it('treats a discarded winning tile that completes a triplet as non-concealed', () => {
    const hand = createHandSnapshot({ winningTile: 'm1' });
    const placed: PlacedWinningDecomposition = {
      decomposition: {
        structureKey: 'standard-meld-pair',
        concealedMelds: [{ kind: 'triplet', tile: 'm1' }],
        pair: { kind: 'pair', tile: 'm2' },
        declaredMelds: [],
      },
      winningTilePlacement: { kind: 'triplet', meldIndex: 0 },
    };

    expect(deriveFacts(hand, createWinContext('discard'), placed).concealedPungCount).toBe(0);
    expect(deriveFacts(hand, createWinContext('self-draw'), placed).concealedPungCount).toBe(1);
  });
});
