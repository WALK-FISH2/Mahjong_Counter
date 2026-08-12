import { getTileMetadata, type TileCode } from '../../domain/mahjong/tile';
import { TileFace } from './TileFace';

export type WinningTileSlotProps = Readonly<{
  tile: TileCode | null;
  selecting: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onUndo: () => void;
  canUndo: boolean;
}>;

export function WinningTileSlot({
  tile,
  selecting,
  onSelect,
  onRemove,
  onUndo,
  canUndo,
}: WinningTileSlotProps) {
  return (
    <section className="hand-board__section winning-tile-slot" aria-labelledby="winning-tile-title">
      <div className="hand-board__label-row">
        <h3 id="winning-tile-title">胡牌张</h3>
        <span>独立单选</span>
      </div>

      <div className="winning-tile-slot__content">
        {tile === null ? (
          <p className="empty-state">尚未指定胡牌张。</p>
        ) : (
          <button
            className="tile-button tile-button--entered"
            type="button"
            aria-label={`撤回胡牌张${getTileMetadata(tile).chineseName}`}
            onClick={onRemove}
          >
            <TileFace tile={tile} />
          </button>
        )}

        <div className="winning-tile-slot__actions">
          <button
            className={selecting ? 'mode-action mode-action--active' : 'secondary-action'}
            type="button"
            aria-pressed={selecting}
            onClick={onSelect}
          >
            {selecting ? '正在选择胡牌张' : tile === null ? '选择胡牌张' : '替换胡牌张'}
          </button>
          <button className="secondary-action" type="button" onClick={onUndo} disabled={!canUndo}>
            撤销上次牌面修改
          </button>
        </div>
      </div>
    </section>
  );
}
