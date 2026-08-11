import { describe, expect, it } from 'vitest';

import { TILE_CODES, type TileCode } from '../../domain/mahjong/tile';
import { parseTileSetDefinition, tileSetDefinitionSchema } from './tile-set-schema';

function tileSet(enabledTiles: readonly TileCode[]) {
  return {
    enabledTiles,
    maxCopies: { [enabledTiles[0] ?? 'm1']: 4 },
    groups: [
      {
        id: 'enabled',
        labelKey: 'tiles.enabled',
        tiles: enabledTiles,
      },
    ],
  };
}

describe('TileSetDefinition schema', () => {
  it.each([
    ['27 suited tiles', TILE_CODES.slice(0, 27), 27],
    ['34 structural tiles', TILE_CODES.slice(0, 34), 34],
    ['all 42 known tile codes', TILE_CODES, 42],
  ] as const)('expresses %s without a rule-ID branch', (_label, enabledTiles, expectedCount) => {
    const parsed = parseTileSetDefinition(tileSet(enabledTiles));

    expect(parsed.enabledTiles).toHaveLength(expectedCount);
    expect(parsed.groups[0]?.tiles).toEqual(enabledTiles);
  });

  it('validates dynamic copy limits without assuming four copies', () => {
    const parsed = parseTileSetDefinition({
      enabledTiles: ['m1', 'spring'],
      maxCopies: { m1: 4, spring: 1 },
      groups: [
        { id: 'structural', labelKey: 'tiles.structural', tiles: ['m1'] },
        { id: 'flowers', labelKey: 'tiles.flowers', tiles: ['spring'] },
      ],
    });

    expect(parsed.maxCopies).toEqual({ m1: 4, spring: 1 });
  });

  it('rejects unknown or duplicate tiles, invalid limits, and disabled group members', () => {
    expect(
      tileSetDefinitionSchema.safeParse({
        enabledTiles: ['m1', 'joker'],
        maxCopies: { m1: 4, joker: 4 },
        groups: [],
      }).success,
    ).toBe(false);
    expect(tileSetDefinitionSchema.safeParse(tileSet(['m1', 'm1'])).success).toBe(false);
    expect(
      tileSetDefinitionSchema.safeParse({
        enabledTiles: ['m1'],
        maxCopies: { m1: 0 },
        groups: [],
      }).success,
    ).toBe(false);
    expect(
      tileSetDefinitionSchema.safeParse({
        enabledTiles: ['m1'],
        maxCopies: { m1: 4 },
        groups: [{ id: 'bad', labelKey: 'tiles.bad', tiles: ['m2'] }],
      }).success,
    ).toBe(false);
  });
});
