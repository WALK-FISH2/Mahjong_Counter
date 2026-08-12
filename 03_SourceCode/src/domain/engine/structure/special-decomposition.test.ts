import { describe, expect, it } from 'vitest';

import { createHandSnapshot } from '../../mahjong/hand';
import { createPungMeld } from '../../mahjong/meld';
import type {
  SevenPairsStructureDefinition,
  ThirteenOrphansStructureDefinition,
} from '../../rules/structure-definition';
import {
  enumerateSevenPairsDecompositions,
  enumerateThirteenOrphansDecompositions,
} from './special-decomposition';

const SEVEN_PAIRS: SevenPairsStructureDefinition = {
  structureKey: 'seven-pairs',
  capabilityKey: 'structure.sevenPairs',
  enabled: true,
  supportStatus: 'SUPPORTED',
  parameters: { requiredPairCount: 7, quadHandling: 'TWO_PAIRS' },
};

const THIRTEEN_ORPHANS: ThirteenOrphansStructureDefinition = {
  structureKey: 'thirteen-orphans',
  capabilityKey: 'structure.thirteenOrphans',
  enabled: true,
  supportStatus: 'SUPPORTED',
  parameters: {
    requiredTiles: [
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
    ],
    duplicateTileCount: 2,
  },
};

describe('seven pairs structure', () => {
  it('recognizes seven pairs and applies the rule-defined quad interpretation', () => {
    const hand = createHandSnapshot({
      concealed: [
        'm1',
        'm1',
        'm1',
        'm1',
        'm2',
        'm2',
        'p3',
        'p3',
        's4',
        's4',
        'east',
        'east',
        'white',
      ],
      winningTile: 'white',
    });

    expect(enumerateSevenPairsDecompositions(hand, SEVEN_PAIRS)).toEqual([
      {
        structureKey: 'seven-pairs',
        pairs: ['m1', 'm1', 'm2', 'p3', 's4', 'east', 'white'],
      },
    ]);
    expect(
      enumerateSevenPairsDecompositions(hand, {
        ...SEVEN_PAIRS,
        parameters: { ...SEVEN_PAIRS.parameters, quadHandling: 'NOT_ALLOWED' },
      }),
    ).toEqual([]);
  });

  it('rejects non-pair counts, declared melds, and disabled capability definitions', () => {
    const invalid = createHandSnapshot({
      concealed: [
        'm1',
        'm1',
        'm2',
        'm2',
        'p3',
        'p3',
        's4',
        's4',
        'east',
        'east',
        'red',
        'green',
        'white',
      ],
      winningTile: 'white',
    });
    const withMeld = createHandSnapshot({
      concealed: ['m1', 'm1', 'm2', 'm2', 'p3', 'p3', 's4', 's4', 'east', 'east'],
      winningTile: 'white',
      melds: [createPungMeld('fixed', 'red')],
    });

    expect(enumerateSevenPairsDecompositions(invalid, SEVEN_PAIRS)).toEqual([]);
    expect(enumerateSevenPairsDecompositions(withMeld, SEVEN_PAIRS)).toEqual([]);
    expect(enumerateSevenPairsDecompositions(invalid, { ...SEVEN_PAIRS, enabled: false })).toEqual(
      [],
    );
  });
});

describe('thirteen orphans structure', () => {
  it('recognizes the data-defined required set with exactly one duplicate', () => {
    const hand = createHandSnapshot({
      concealed: [
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
      ],
      winningTile: 'east',
    });

    expect(enumerateThirteenOrphansDecompositions(hand, THIRTEEN_ORPHANS)).toEqual([
      {
        structureKey: 'thirteen-orphans',
        requiredTiles: THIRTEEN_ORPHANS.parameters.requiredTiles,
        pairTile: 'east',
      },
    ]);
  });

  it('rejects a missing required tile, an unexpected tile, and declared melds', () => {
    const invalid = createHandSnapshot({
      concealed: [
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
        'm2',
      ],
      winningTile: 'east',
    });
    const withMeld = createHandSnapshot({
      concealed: ['m1', 'm9', 'p1', 'p9', 's1', 's9', 'east', 'south', 'west', 'north'],
      winningTile: 'east',
      melds: [createPungMeld('fixed', 'red')],
    });

    expect(enumerateThirteenOrphansDecompositions(invalid, THIRTEEN_ORPHANS)).toEqual([]);
    expect(enumerateThirteenOrphansDecompositions(withMeld, THIRTEEN_ORPHANS)).toEqual([]);
  });
});
