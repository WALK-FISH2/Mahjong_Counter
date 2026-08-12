import { getTileMetadata, type TileCode } from '../../domain/mahjong/tile';
import type { TileSetDefinition } from '../../domain/rules/tile-set';
import { getTileCount, type TileCountByCode } from '../../domain/mahjong/validation';
import { TileFace } from './TileFace';
import { getTilePaletteGroups } from './tile-palette-groups';

export type TilePaletteProps = Readonly<{
  tileSet: TileSetDefinition;
  tileCounts: TileCountByCode;
  limitCounts?: TileCountByCode;
  onTileSelect: (tile: TileCode) => void;
  inputLabel?: string;
}>;

export function TilePalette({
  tileSet,
  tileCounts,
  limitCounts = tileCounts,
  onTileSelect,
  inputLabel = '默认录入到手牌',
}: TilePaletteProps) {
  const groups = getTilePaletteGroups(tileSet);

  return (
    <section className="calculator-panel tile-palette" aria-labelledby="tile-palette-title">
      <div className="calculator-panel__heading">
        <div>
          <p className="section-kicker">{inputLabel}</p>
          <h2 id="tile-palette-title">选牌器</h2>
        </div>
        <span className="tile-palette__total">{tileSet.enabledTiles.length} 种牌</span>
      </div>

      <div className="tile-palette__groups">
        {groups.map((group) => (
          <section className="tile-palette__group" aria-label={group.label} key={group.id}>
            <h3>{group.label}</h3>
            <div className="tile-palette__tiles">
              {group.tiles.map((tile) => {
                const count = getTileCount(tileCounts, tile);
                const limitCount = getTileCount(limitCounts, tile);
                const maximum = tileSet.maxCopies[tile];
                const atLimit = maximum !== undefined && limitCount >= maximum;
                const disabled = atLimit;
                const metadata = getTileMetadata(tile);
                const disabledReason = atLimit ? `，已达到上限 ${maximum} 张` : '';

                return (
                  <button
                    className="tile-button"
                    type="button"
                    key={tile}
                    data-tile-code={tile}
                    disabled={disabled}
                    aria-label={`${metadata.chineseName}，已使用 ${count} 张${disabledReason}`}
                    onClick={() => onTileSelect(tile)}
                  >
                    <TileFace tile={tile} />
                    <span className="tile-button__count" aria-hidden="true">
                      ×{count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
