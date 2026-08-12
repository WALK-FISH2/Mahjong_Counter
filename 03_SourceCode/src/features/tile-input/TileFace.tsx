import type { TileCode } from '../../domain/mahjong/tile';
import { getTileSymbol } from './tile-symbol';

export function TileFace({ tile }: Readonly<{ tile: TileCode }>) {
  return (
    <span className="tile-face" aria-hidden="true">
      {getTileSymbol(tile)}
    </span>
  );
}
