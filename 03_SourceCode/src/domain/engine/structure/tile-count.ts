import { TILE_CODES, type TileCode } from '../../mahjong/tile';

export const TILE_COUNT_SIZE = TILE_CODES.length;

const TILE_INDEX_BY_CODE: ReadonlyMap<TileCode, number> = new Map(
  TILE_CODES.map((tile, index) => [tile, index]),
);

export type TileCount = Readonly<{
  counts: readonly number[];
  total: number;
}>;

export function tileCodeToIndex(tile: TileCode): number {
  const index = TILE_INDEX_BY_CODE.get(tile);

  if (index === undefined) {
    throw new RangeError(`Unknown TileCode: ${String(tile)}`);
  }

  return index;
}

export function tileIndexToCode(index: number): TileCode {
  if (!Number.isInteger(index) || index < 0 || index >= TILE_COUNT_SIZE) {
    throw new RangeError(`Tile index out of range: ${String(index)}`);
  }

  return TILE_CODES[index]!;
}

export function createTileCount(tiles: readonly TileCode[]): TileCount {
  const counts = Array<number>(TILE_COUNT_SIZE).fill(0);

  for (const tile of tiles) {
    const index = tileCodeToIndex(tile);
    counts[index] = counts[index]! + 1;
  }

  return Object.freeze({
    counts: Object.freeze(counts),
    total: tiles.length,
  });
}

export function getTileCountAtIndex(tileCount: TileCount, index: number): number {
  tileIndexToCode(index);
  return tileCount.counts[index]!;
}

export function getTileCountForCode(tileCount: TileCount, tile: TileCode): number {
  return getTileCountAtIndex(tileCount, tileCodeToIndex(tile));
}

export function expandTileCount(tileCount: TileCount): readonly TileCode[] {
  const tiles: TileCode[] = [];

  tileCount.counts.forEach((count, index) => {
    const tile = tileIndexToCode(index);

    for (let copy = 0; copy < count; copy += 1) {
      tiles.push(tile);
    }
  });

  return Object.freeze(tiles);
}
