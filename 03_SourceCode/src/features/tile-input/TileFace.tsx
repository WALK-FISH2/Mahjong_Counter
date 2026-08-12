import type { TileCode } from '../../domain/mahjong/tile';
import { resolveTileAsset } from '../../assets/tiles/unicode/manifest';
import { getTileSymbol } from './tile-symbol';

export function TileFace({ tile }: Readonly<{ tile: TileCode }>) {
  return (
    <span className="tile-face" aria-hidden="true" data-tile-asset={resolveTileAsset(tile)}>
      {getTileSymbol(tile)}
    </span>
  );
}
