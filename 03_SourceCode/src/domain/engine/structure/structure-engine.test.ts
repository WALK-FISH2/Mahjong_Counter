import { describe, expect, it } from 'vitest';

import { createHandSnapshot } from '../../mahjong/hand';
import type { HandModelDefinition } from '../../rules/hand-model';
import type { StructureDefinition } from '../../rules/structure-definition';
import { enumerateWinningDecompositions } from './structure-engine';

const HAND_MODEL: HandModelDefinition = {
  targetStructuralTileCount: 14,
  readyStructuralTileCount: 13,
  requiredMeldCount: 4,
  allowedMeldTypes: ['chow', 'pung', 'open-kong', 'concealed-kong'],
  openKongPolicy: { distinction: 'undifferentiated', allowedKinds: ['direct', 'added'] },
  maxDeclaredMelds: 4,
  flowerPolicy: 'separate',
};

const STRUCTURES: readonly StructureDefinition[] = [
  {
    structureKey: 'standard-meld-pair',
    capabilityKey: 'structure.standard',
    enabled: true,
    supportStatus: 'SUPPORTED',
  },
  {
    structureKey: 'seven-pairs',
    capabilityKey: 'structure.sevenPairs',
    enabled: true,
    supportStatus: 'SUPPORTED',
    parameters: { requiredPairCount: 7, quadHandling: 'TWO_PAIRS' },
  },
  {
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
  },
];

describe('multi-structure enumeration', () => {
  it('returns every enabled structure for a hand that is both standard and seven pairs', () => {
    const hand = createHandSnapshot({
      concealed: ['m1', 'm1', 'm2', 'm2', 'm3', 'm3', 'p4', 'p4', 'p5', 'p5', 'p6', 'p6', 'east'],
      winningTile: 'east',
    });
    const result = enumerateWinningDecompositions({
      hand,
      handModel: HAND_MODEL,
      structures: STRUCTURES,
    });

    expect(new Set(result.decompositions.map(({ structureKey }) => structureKey))).toEqual(
      new Set(['standard-meld-pair', 'seven-pairs']),
    );
    expect(
      result.decompositions.filter(({ structureKey }) => structureKey === 'standard-meld-pair')
        .length,
    ).toBeGreaterThan(0);
  });

  it('uses StructureDefinition enabled state rather than a fixed structure priority', () => {
    const hand = createHandSnapshot({
      concealed: ['m1', 'm1', 'm2', 'm2', 'm3', 'm3', 'p4', 'p4', 'p5', 'p5', 'p6', 'p6', 'east'],
      winningTile: 'east',
    });
    const structures = STRUCTURES.map((structure) =>
      structure.supportStatus === 'SUPPORTED' && structure.structureKey === 'seven-pairs'
        ? { ...structure, enabled: false }
        : structure,
    );
    const result = enumerateWinningDecompositions({ hand, handModel: HAND_MODEL, structures });

    expect(result.decompositions.map(({ structureKey }) => structureKey)).not.toContain(
      'seven-pairs',
    );
    expect(result.decompositions.map(({ structureKey }) => structureKey)).toContain(
      'standard-meld-pair',
    );
  });

  it('keeps unsupported structures explicit and deterministically deduplicated', () => {
    const unsupported: StructureDefinition = {
      structureKey: 'all-unrelated',
      enabled: false,
      supportStatus: 'NOT_SUPPORTED_IN_V0_1',
      reasonCode: 'STRUCTURE_NOT_IMPLEMENTED',
    };
    const result = enumerateWinningDecompositions({
      hand: createHandSnapshot(),
      handModel: HAND_MODEL,
      structures: [unsupported, unsupported],
    });

    expect(result.decompositions).toEqual([]);
    expect(result.unsupportedStructures).toEqual(['all-unrelated']);
    expect(result.unavailableCapabilities).toEqual([]);
  });

  it('does not execute an unknown or mismatched capability', () => {
    const sevenPairs = STRUCTURES.find((structure) => structure.structureKey === 'seven-pairs');

    if (sevenPairs?.supportStatus !== 'SUPPORTED' || sevenPairs.structureKey !== 'seven-pairs') {
      throw new Error('Seven pairs fixture is unavailable.');
    }

    const result = enumerateWinningDecompositions({
      hand: createHandSnapshot({
        concealed: ['m1', 'm1', 'm2', 'm2', 'm3', 'm3', 'p4', 'p4', 'p5', 'p5', 'p6', 'p6', 'east'],
        winningTile: 'east',
      }),
      handModel: HAND_MODEL,
      structures: [{ ...sevenPairs, capabilityKey: 'structure.standard' }],
    });

    expect(result.decompositions).toEqual([]);
    expect(result.unavailableCapabilities).toEqual(['structure.standard']);
  });
});
