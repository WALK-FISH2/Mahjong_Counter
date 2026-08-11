import type { TileCode } from '../mahjong/tile';

export type TileSetGroupDefinition = Readonly<{
  id: string;
  labelKey: string;
  tiles: readonly TileCode[];
}>;

export type TileSetDefinition = Readonly<{
  enabledTiles: readonly TileCode[];
  maxCopies: Readonly<Partial<Record<TileCode, number>>>;
  groups: readonly TileSetGroupDefinition[];
}>;
