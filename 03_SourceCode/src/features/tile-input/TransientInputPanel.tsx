import { getTileMetadata, type TileCode } from '../../domain/mahjong/tile';
import type { TransientInputSession } from '../../domain/mahjong/meld-input-state';
import { TileFace } from './TileFace';

export type TransientInputPanelProps = Readonly<{
  session: Exclude<TransientInputSession, Readonly<{ kind: 'none' }>>;
  editing: boolean;
  addedKongTile: TileCode | null;
  onRemoveChowTile: (index: number) => void;
  onCancel: () => void;
}>;

const TITLES: Readonly<Record<Exclude<TransientInputSession['kind'], 'none'>, string>> = {
  chow: '录入吃牌',
  pung: '录入碰牌',
  'open-kong': '录入明杠',
  'concealed-kong': '录入暗杠',
  flower: '录入花牌',
};

export function TransientInputPanel({
  session,
  editing,
  addedKongTile,
  onRemoveChowTile,
  onCancel,
}: TransientInputPanelProps) {
  const description =
    session.kind === 'chow'
      ? '依次选择三张同花色连续牌；点击临时牌可撤回。'
      : session.kind === 'pung'
        ? '选择一种牌，系统会生成完整三张碰牌。'
        : session.kind === 'flower'
          ? '选择一张当前规则启用的具体花牌。'
          : session.kind === 'open-kong' && session.openKind === 'added'
            ? `选择${addedKongTile === null ? '原碰牌' : getTileMetadata(addedKongTile).chineseName}完成加杠。`
            : '选择一种牌，系统会生成完整四张杠牌。';

  return (
    <section className="calculator-panel transient-input" aria-labelledby="transient-input-title">
      <div className="calculator-panel__heading">
        <div>
          <p className="section-kicker">{editing ? '整组编辑' : '尚未写入正式牌面'}</p>
          <h2 id="transient-input-title">{TITLES[session.kind]}</h2>
        </div>
        <button className="secondary-action" type="button" onClick={onCancel}>
          取消本次录入
        </button>
      </div>
      <p>{description}</p>

      {session.kind === 'chow' && (
        <div className="transient-input__slots" aria-label="吃牌临时牌位">
          {[0, 1, 2].map((index) => {
            const tile = session.selected[index];
            return tile === undefined ? (
              <span className="transient-input__empty-slot" key={index}>
                {index + 1}
              </span>
            ) : (
              <button
                className="tile-button tile-button--entered"
                type="button"
                key={`${tile}-${index}`}
                aria-label={`撤回临时${getTileMetadata(tile).chineseName}`}
                onClick={() => onRemoveChowTile(index)}
              >
                <TileFace tile={tile} />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
