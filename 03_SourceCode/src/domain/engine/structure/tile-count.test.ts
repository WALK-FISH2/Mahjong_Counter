import { describe, expect, it } from 'vitest';

import { TILE_CODES } from '../../mahjong/tile';
import {
  createTileCount,
  expandTileCount,
  getTileCountAtIndex,
  getTileCountForCode,
  TILE_COUNT_SIZE,
  tileCodeToIndex,
  tileIndexToCode,
} from './tile-count';

describe('TileCount', () => {
  it('roundtrips every stable TileCode through its internal index', () => {
    expect(TILE_COUNT_SIZE).toBe(TILE_CODES.length);

    const indexes = TILE_CODES.map((tile) => tileCodeToIndex(tile));

    expect(new Set(indexes).size).toBe(TILE_CODES.length);
    expect(indexes).toEqual(TILE_CODES.map((_, index) => index));
    expect(indexes.map(tileIndexToCode)).toEqual(TILE_CODES);
  });

  it('stores counts in canonical index order and expands without loss', () => {
    const tileCount = createTileCount(['white', 'm1', 'white', 'spring', 'm9']);

    expect(tileCount.total).toBe(5);
    expect(getTileCountForCode(tileCount, 'white')).toBe(2);
    expect(getTileCountAtIndex(tileCount, tileCodeToIndex('spring'))).toBe(1);
    expect(getTileCountForCode(tileCount, 'east')).toBe(0);
    expect(expandTileCount(tileCount)).toEqual(['m1', 'm9', 'white', 'white', 'spring']);
  });

  it('rejects invalid internal indexes rather than aliasing a tile', () => {
    expect(() => tileIndexToCode(-1)).toThrow(RangeError);
    expect(() => tileIndexToCode(TILE_COUNT_SIZE)).toThrow(RangeError);
    expect(() => tileIndexToCode(1.5)).toThrow(RangeError);
  });
});
