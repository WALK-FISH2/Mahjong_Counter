import type { DisplayedConcealedTile } from '../../application/calculator/calculator-store';
import { getTileMetadata, type TileCode } from '../../domain/mahjong/tile';
import type { Meld } from '../../domain/mahjong/meld';
import { TileFace } from './TileFace';
import { WinningTileSlot } from './WinningTileSlot';

export type EnteredHandBoardProps = Readonly<{
  concealedTiles: readonly DisplayedConcealedTile[];
  melds: readonly Meld[];
  flowers: readonly TileCode[];
  winningTile: TileCode | null;
  isArranged: boolean;
  canUndo: boolean;
  selectingWinningTile: boolean;
  distinguishOpenKongKind: boolean;
  discardCandidateTiles?: readonly TileCode[];
  selectedDiscardTile?: TileCode | null;
  canUpgradePung: (meld: Meld) => boolean;
  onRemoveConcealed: (originalIndex: number) => void;
  onArrange: () => void;
  onSelectWinningTile: () => void;
  onRemoveWinningTile: () => void;
  onEditMeld: (meldId: string) => void;
  onUpgradePung: (meldId: string) => void;
  onRemoveMeld: (meldId: string) => void;
  onRemoveFlower: (index: number) => void;
  onUndo: () => void;
  onSelectDiscardCandidate?: ((tile: TileCode) => void) | undefined;
}>;

function meldLabel(meld: Meld): string {
  if (meld.type === 'chow') return '吃';
  if (meld.type === 'pung') return '碰';
  return meld.exposure === 'open' ? '明杠' : '暗杠';
}

function meldTiles(meld: Meld): readonly TileCode[] {
  if (meld.type === 'chow') return meld.tiles;
  const count = meld.type === 'pung' ? 3 : 4;
  return Array.from({ length: count }, () => meld.tile);
}

export function EnteredHandBoard({
  concealedTiles,
  melds,
  flowers,
  winningTile,
  isArranged,
  canUndo,
  selectingWinningTile,
  distinguishOpenKongKind,
  discardCandidateTiles = [],
  selectedDiscardTile = null,
  canUpgradePung,
  onRemoveConcealed,
  onArrange,
  onSelectWinningTile,
  onRemoveWinningTile,
  onEditMeld,
  onUpgradePung,
  onRemoveMeld,
  onRemoveFlower,
  onUndo,
  onSelectDiscardCandidate,
}: EnteredHandBoardProps) {
  const discardCandidates = new Set(discardCandidateTiles);
  return (
    <section className="calculator-panel hand-board" aria-labelledby="hand-board-title">
      <div className="calculator-panel__heading">
        <div>
          <p className="section-kicker">视觉集中、数据分离</p>
          <h2 id="hand-board-title">已录入牌面</h2>
        </div>
        <button
          className="secondary-action"
          type="button"
          onClick={onArrange}
          disabled={concealedTiles.length < 2 || isArranged}
        >
          {isArranged ? '已整理' : '一键整理'}
        </button>
      </div>

      <div className="hand-board__section">
        <div className="hand-board__label-row">
          <h3>手牌</h3>
          <span>{concealedTiles.length} 张</span>
        </div>
        {concealedTiles.length === 0 ? (
          <p className="empty-state">点击上方牌面开始录入。</p>
        ) : (
          <div className="hand-board__tiles" aria-label="当前手牌">
            {concealedTiles.map(({ tile, originalIndex }) => (
              <span className="entered-tile-stack" key={`${tile}-${originalIndex}`}>
                <button
                  className="tile-button tile-button--entered"
                  type="button"
                  aria-label={`撤回${getTileMetadata(tile).chineseName}`}
                  onClick={() => onRemoveConcealed(originalIndex)}
                >
                  <TileFace tile={tile} />
                </button>
                {discardCandidates.has(tile) && onSelectDiscardCandidate !== undefined && (
                  <button
                    className="discard-candidate-marker"
                    type="button"
                    aria-label={`查看打出${getTileMetadata(tile).chineseName}后的听牌`}
                    aria-pressed={selectedDiscardTile === tile}
                    onClick={() => onSelectDiscardCandidate(tile)}
                  >
                    <span aria-hidden="true">▲</span>
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        {isArranged && (
          <p className="hand-board__note" role="status">
            当前仅按牌面顺序展示，原始录入顺序未改变。
          </p>
        )}
      </div>

      <WinningTileSlot
        tile={winningTile}
        selecting={selectingWinningTile}
        onSelect={onSelectWinningTile}
        onRemove={onRemoveWinningTile}
        onUndo={onUndo}
        canUndo={canUndo}
      />

      <div className="hand-board__section">
        <div className="hand-board__label-row">
          <h3>副露与杠</h3>
          <span>{melds.length} 组</span>
        </div>
        {melds.length === 0 ? (
          <p className="empty-state">尚未录入吃、碰或杠。</p>
        ) : (
          <div className="meld-groups" aria-label="已完成副露">
            {melds.map((meld) => (
              <article className="meld-card" key={meld.id} data-meld-id={meld.id}>
                <div className="meld-card__heading">
                  <strong>{meldLabel(meld)}</strong>
                  <span>
                    {distinguishOpenKongKind && meld.type === 'kong' && meld.exposure === 'open'
                      ? meld.openKind === 'added'
                        ? '加杠'
                        : '直杠'
                      : ''}
                  </span>
                </div>
                <div className="meld-card__tiles" aria-label={`${meldLabel(meld)}牌组`}>
                  {meldTiles(meld).map((tile, index) => (
                    <span className="tile-button tile-button--static" key={`${tile}-${index}`}>
                      <TileFace tile={tile} />
                    </span>
                  ))}
                </div>
                <div className="meld-card__actions">
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={() => onEditMeld(meld.id)}
                  >
                    修改整组
                  </button>
                  {canUpgradePung(meld) && (
                    <button
                      className="secondary-action"
                      type="button"
                      onClick={() => onUpgradePung(meld.id)}
                    >
                      升级加杠
                    </button>
                  )}
                  <button
                    className="danger-action"
                    type="button"
                    onClick={() => onRemoveMeld(meld.id)}
                  >
                    删除整组
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="hand-board__section">
        <div className="hand-board__label-row">
          <h3>花牌</h3>
          <span>{flowers.length} 张</span>
        </div>
        {flowers.length === 0 ? (
          <p className="empty-state">尚未录入花牌。</p>
        ) : (
          <div className="hand-board__tiles" aria-label="已录入花牌">
            {flowers.map((tile, index) => (
              <button
                className="tile-button tile-button--entered"
                type="button"
                key={`${tile}-${index}`}
                aria-label={`撤回花牌${getTileMetadata(tile).chineseName}`}
                onClick={() => onRemoveFlower(index)}
              >
                <TileFace tile={tile} />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
