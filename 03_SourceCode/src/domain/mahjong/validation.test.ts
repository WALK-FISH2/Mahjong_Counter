import { describe, expect, it } from 'vitest';

import { createHandSnapshot } from './hand';
import { createChowMeld, createOpenKongMeld, createPungMeld } from './meld';
import { getTileMetadata, TILE_CODES, type TileCode } from './tile';
import {
  countHandTilesByCode,
  getTileCount,
  validateHandSnapshot,
  type HandValidationPolicy,
} from './validation';

function createPolicy(
  overrides: Readonly<Partial<Record<TileCode, number>>> = {},
  enabledTiles: readonly TileCode[] = TILE_CODES,
): HandValidationPolicy {
  const maxCopies = Object.fromEntries(
    TILE_CODES.map((tile) => [tile, getTileMetadata(tile).kind === 'flower' ? 1 : 4]),
  ) as Record<TileCode, number>;

  return {
    enabledTiles,
    maxCopies: { ...maxCopies, ...overrides },
  };
}

describe('global hand tile counting', () => {
  it('counts concealed, every meld entity, flowers, and the winning tile by stable code', () => {
    const hand = createHandSnapshot({
      concealed: ['m1', 'm1'],
      melds: [
        createChowMeld('chow', ['m2', 'm3', 'm4']),
        createPungMeld('pung', 'east'),
        createOpenKongMeld('kong', 'p5'),
      ],
      flowers: ['spring'],
      winningTile: 'm1',
    });
    const counts = countHandTilesByCode(hand);

    expect(getTileCount(counts, 'm1')).toBe(3);
    expect(getTileCount(counts, 'm2')).toBe(1);
    expect(getTileCount(counts, 'east')).toBe(3);
    expect(getTileCount(counts, 'p5')).toBe(4);
    expect(getTileCount(counts, 'spring')).toBe(1);
    expect(getTileCount(counts, 'white')).toBe(0);
  });
});

describe('HandSnapshot hard validation', () => {
  it('rejects a fifth tile using the supplied dynamic maxCopies policy', () => {
    const hand = createHandSnapshot({
      melds: [createOpenKongMeld('kong', 'm1')],
      winningTile: 'm1',
    });
    const limited = validateHandSnapshot(hand, createPolicy({ m1: 4 }));
    const expanded = validateHandSnapshot(hand, createPolicy({ m1: 5 }));

    expect(limited.issues).toContainEqual({
      reasonCode: 'TILE_COPY_LIMIT_EXCEEDED',
      data: { tile: 'm1', actual: 5, maximum: 4 },
    });
    expect(limited.counts).toEqual({ structuralTileCount: 4, physicalTileCount: 5 });
    expect(expanded.isValid).toBe(true);
  });

  it('reports disabled tiles, invalid regions, malformed chows, and meld IDs with stable codes', () => {
    const hand = createHandSnapshot({
      concealed: ['spring', 'east'],
      melds: [
        createChowMeld('duplicate', ['m1', 'p2', 'm3']),
        createPungMeld('duplicate', 'plum'),
        createPungMeld('', 'm2'),
      ],
      flowers: ['m9'],
      winningTile: 'east',
    });
    const enabledTiles = TILE_CODES.filter((tile) => tile !== 'east');
    const result = validateHandSnapshot(hand, createPolicy({ east: 1 }, enabledTiles));
    const codes = result.issues.map((issue) => issue.reasonCode);

    expect(result.isValid).toBe(false);
    expect(codes).toContain('TILE_NOT_ENABLED');
    expect(codes).toContain('TILE_COPY_LIMIT_EXCEEDED');
    expect(codes).toContain('FLOWER_IN_STRUCTURAL_AREA');
    expect(codes).toContain('NON_FLOWER_IN_FLOWER_AREA');
    expect(codes).toContain('INVALID_CHOW');
    expect(codes).toContain('DUPLICATE_MELD_ID');
    expect(codes).toContain('EMPTY_MELD_ID');
    expect(result.issues.every((issue) => 'reasonCode' in issue && 'data' in issue)).toBe(true);
  });

  it('accepts a valid hand projection and never rewrites the supplied snapshot', () => {
    const hand = createHandSnapshot({
      concealed: ['m9', 'm1'],
      melds: [createChowMeld('chow', ['s3', 's1', 's2']), createPungMeld('pung', 'white')],
      flowers: ['orchid'],
      winningTile: 'p9',
    });
    const before = JSON.stringify(hand);
    const result = validateHandSnapshot(hand, createPolicy());

    expect(result.isValid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(JSON.stringify(hand)).toBe(before);
    expect(hand.melds[0]).toMatchObject({ tiles: ['s3', 's1', 's2'] });
  });
});
