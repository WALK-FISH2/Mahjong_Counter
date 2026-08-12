import type { DisplayedConcealedTile } from '../../application/calculator/calculator-store';
import { getTileMetadata } from '../../domain/mahjong/tile';
import { TileFace } from './TileFace';

export type ConcealedHandProps = Readonly<{
  tiles: readonly DisplayedConcealedTile[];
  isArranged: boolean;
  onRemove: (originalIndex: number) => void;
  onArrange: () => void;
}>;

export function ConcealedHand({ tiles, isArranged, onRemove, onArrange }: ConcealedHandProps) {
  return (
    <section className="calculator-panel hand-board" aria-labelledby="hand-board-title">
      <div className="calculator-panel__heading">
        <div>
          <p className="section-kicker">按录入顺序保存</p>
          <h2 id="hand-board-title">已录入牌面</h2>
        </div>
        <button
          className="secondary-action"
          type="button"
          onClick={onArrange}
          disabled={tiles.length < 2 || isArranged}
        >
          {isArranged ? '已整理' : '一键整理'}
        </button>
      </div>

      <div className="hand-board__section">
        <div className="hand-board__label-row">
          <h3>手牌</h3>
          <span>{tiles.length} 张</span>
        </div>

        {tiles.length === 0 ? (
          <p className="empty-state">点击上方牌面开始录入。</p>
        ) : (
          <div className="hand-board__tiles" aria-label="当前手牌">
            {tiles.map(({ tile, originalIndex }) => (
              <button
                className="tile-button tile-button--entered"
                type="button"
                key={`${tile}-${originalIndex}`}
                data-original-index={originalIndex}
                aria-label={`撤回${getTileMetadata(tile).chineseName}`}
                onClick={() => onRemove(originalIndex)}
              >
                <TileFace tile={tile} />
              </button>
            ))}
          </div>
        )}

        {isArranged && (
          <p className="hand-board__note" role="status">
            当前仅按牌面顺序展示，原始录入顺序未改变。
          </p>
        )}
      </div>
    </section>
  );
}
