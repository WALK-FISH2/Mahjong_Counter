import type { DisplayedConcealedTile } from '../../application/calculator/calculator-store';
import { getTileMetadata } from '../../domain/mahjong/tile';
import { TileFace } from './TileFace';

export type WinningTileConfirmationProps = Readonly<{
  tiles: readonly DisplayedConcealedTile[];
  recommendedOriginalIndex: number;
  onConfirm: (originalIndex: number) => void;
  onDismiss: () => void;
}>;

export function WinningTileConfirmation({
  tiles,
  recommendedOriginalIndex,
  onConfirm,
  onDismiss,
}: WinningTileConfirmationProps) {
  return (
    <section
      className="calculator-panel winning-confirmation"
      aria-labelledby="winning-confirm-title"
    >
      <div className="calculator-panel__heading">
        <div>
          <p className="section-kicker">必须由你确认</p>
          <h2 id="winning-confirm-title">请选择胡牌张</h2>
        </div>
        <button className="secondary-action" type="button" onClick={onDismiss}>
          暂不确认
        </button>
      </div>
      <p>牌面结构已经和。系统仅推荐最后录入牌，不会自动认定。</p>
      <div className="winning-confirmation__tiles">
        {tiles.map(({ tile, originalIndex }) => (
          <button
            className={
              originalIndex === recommendedOriginalIndex
                ? 'tile-button winning-confirmation__recommended'
                : 'tile-button'
            }
            type="button"
            key={`${tile}-${originalIndex}`}
            aria-label={`确认为胡牌张${getTileMetadata(tile).chineseName}${
              originalIndex === recommendedOriginalIndex ? '，推荐' : ''
            }`}
            onClick={() => onConfirm(originalIndex)}
          >
            <TileFace tile={tile} />
          </button>
        ))}
      </div>
    </section>
  );
}
