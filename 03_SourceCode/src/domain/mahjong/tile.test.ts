import { describe, expect, it } from 'vitest';

import { compareTileCodes, getTileMetadata, isTileCode, TILE_CODES, TILE_METADATA } from './tile';

describe('TileCode and tile metadata', () => {
  it('defines exactly 42 unique stable tile codes', () => {
    expect(TILE_CODES).toHaveLength(42);
    expect(new Set(TILE_CODES).size).toBe(42);
    expect(Object.keys(TILE_METADATA)).toEqual([...TILE_CODES]);
  });

  it('provides a matching Chinese name and stable sort index for every tile', () => {
    TILE_CODES.forEach((code, sortIndex) => {
      const metadata = getTileMetadata(code);

      expect(metadata.code).toBe(code);
      expect(metadata.chineseName.length).toBeGreaterThan(0);
      expect(metadata.sortIndex).toBe(sortIndex);
    });
  });

  it('keeps the approved 27 suited, 7 honor, and 8 flower category split', () => {
    const metadata = Object.values(TILE_METADATA);

    expect(metadata.filter((tile) => tile.kind === 'suited')).toHaveLength(27);
    expect(metadata.filter((tile) => tile.kind === 'honor')).toHaveLength(7);
    expect(metadata.filter((tile) => tile.kind === 'flower')).toHaveLength(8);
  });

  it('sorts every tile into the canonical code order', () => {
    expect([...TILE_CODES].reverse().sort(compareTileCodes)).toEqual(TILE_CODES);
  });

  it('recognizes only approved stable codes', () => {
    expect(isTileCode('m1')).toBe(true);
    expect(isTileCode('chrysanthemum')).toBe(true);
    expect(isTileCode('1m')).toBe(false);
    expect(isTileCode('E')).toBe(false);
    expect(isTileCode(null)).toBe(false);
  });
});
