import { useState } from 'react';
import { useStore } from 'zustand';

import {
  getDisplayedConcealedTiles,
  type CalculatorStore,
} from '../../application/calculator/calculator-store';
import { countHandTilesByCode } from '../../domain/mahjong/validation';
import { ConcealedHand } from '../../features/tile-input/ConcealedHand';
import { TilePalette } from '../../features/tile-input/TilePalette';
import { CalculatorHeader } from './CalculatorHeader';

export type CalculatorPageProps = Readonly<{
  store?: CalculatorStore | undefined;
  loadFailed?: boolean;
}>;

function CalculatorLoading({ failed }: Readonly<{ failed: boolean }>) {
  return (
    <section className="page-shell calculator-load-state" aria-labelledby="calculator-title">
      <h1 id="calculator-title">算番</h1>
      <p role={failed ? 'alert' : 'status'}>
        {failed ? '当前规则加载失败，请刷新后重试。' : '正在载入当前规则…'}
      </p>
    </section>
  );
}

function LoadedCalculatorPage({ store }: Readonly<{ store: CalculatorStore }>) {
  const [inputNotice, setInputNotice] = useState<string | null>(null);
  const document = useStore(store, (state) => state.document);
  const rulePackage = useStore(store, (state) => state.rulePackage);
  const concealedSortMode = useStore(store, (state) => state.concealedSortMode);
  const addConcealedTile = useStore(store, (state) => state.addConcealedTile);
  const removeConcealedTile = useStore(store, (state) => state.removeConcealedTile);
  const arrangeConcealedTiles = useStore(store, (state) => state.arrangeConcealedTiles);
  const tileCounts = countHandTilesByCode(document.hand);
  const displayedTiles = getDisplayedConcealedTiles(document, concealedSortMode);

  return (
    <article className="calculator-page" aria-labelledby="calculator-title">
      <CalculatorHeader manifest={rulePackage.manifest} document={document} />

      <div className="calculator-layout" data-testid="calculator-layout">
        <div className="calculator-layout__input">
          <TilePalette
            tileSet={rulePackage.tileSet}
            tileCounts={tileCounts}
            onTileSelect={(tile) => {
              const result = addConcealedTile(tile);

              if (result.accepted) {
                setInputNotice(null);
              } else if (result.reasonCode === 'TILE_NOT_CONCEALED') {
                setInputNotice('花牌不能加入暗手牌，需通过独立的临时录入流程。');
              } else if (result.reasonCode === 'TILE_NOT_ENABLED') {
                setInputNotice('当前规则不使用这张牌。');
              } else {
                setInputNotice('这张牌已达到当前规则允许的数量上限。');
              }
            }}
          />
          {inputNotice !== null && (
            <p className="input-notice" role="status">
              {inputNotice}
            </p>
          )}
          <ConcealedHand
            tiles={displayedTiles}
            isArranged={concealedSortMode === 'tile-order'}
            onRemove={(originalIndex) => {
              removeConcealedTile(originalIndex);
            }}
            onArrange={arrangeConcealedTiles}
          />
        </div>

        <div className="calculator-layout__analysis">
          <section className="calculator-panel context-summary" aria-labelledby="context-title">
            <p className="section-kicker">当前计算条件</p>
            <h2 id="context-title">和牌条件</h2>
            <dl>
              <div>
                <dt>和牌方式</dt>
                <dd>{document.context.mode === 'discard' ? '点炮' : '自摸'}</dd>
              </div>
            </dl>
          </section>

          <section className="calculator-panel analysis-summary" aria-labelledby="analysis-title">
            <p className="section-kicker">当前状态</p>
            <h2 id="analysis-title">分析结果</h2>
            <p>尚未开始分析</p>
          </section>
        </div>
      </div>
    </article>
  );
}

export function CalculatorPage({ store, loadFailed = false }: CalculatorPageProps) {
  if (store === undefined) {
    return <CalculatorLoading failed={loadFailed} />;
  }

  return <LoadedCalculatorPage store={store} />;
}
