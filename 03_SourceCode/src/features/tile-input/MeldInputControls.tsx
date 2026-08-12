import type { CalculatorTransientInputKind } from '../../application/calculator/calculator-store';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';

export type MeldInputControlsProps = Readonly<{
  rulePackage: RulePackageDefinition;
  activeKind: CalculatorTransientInputKind | null;
  meldCount: number;
  onStart: (kind: CalculatorTransientInputKind, openKind?: 'direct' | 'added') => void;
}>;

type InputAction = Readonly<{
  kind: CalculatorTransientInputKind;
  label: string;
  openKind?: 'direct' | 'added';
}>;

export function MeldInputControls({
  rulePackage,
  activeKind,
  meldCount,
  onStart,
}: MeldInputControlsProps) {
  const actions: InputAction[] = [];
  const handModel = rulePackage.handModel;

  if (handModel.allowedMeldTypes.includes('chow')) actions.push({ kind: 'chow', label: '吃' });
  if (handModel.allowedMeldTypes.includes('pung')) actions.push({ kind: 'pung', label: '碰' });
  if (
    handModel.allowedMeldTypes.includes('open-kong') &&
    handModel.openKongPolicy.allowedKinds.includes('direct')
  ) {
    actions.push({
      kind: 'open-kong',
      label: handModel.openKongPolicy.distinction === 'distinguished' ? '明杠·直杠' : '明杠',
      openKind: 'direct',
    });
  }
  if (handModel.allowedMeldTypes.includes('concealed-kong')) {
    actions.push({ kind: 'concealed-kong', label: '暗杠' });
  }
  if (handModel.flowerPolicy === 'separate') actions.push({ kind: 'flower', label: '花牌' });

  const atMeldLimit = meldCount >= handModel.maxDeclaredMelds;

  return (
    <section className="calculator-panel meld-input-controls" aria-labelledby="meld-input-title">
      <div className="calculator-panel__heading">
        <div>
          <p className="section-kicker">临时录入</p>
          <h2 id="meld-input-title">吃碰杠花</h2>
        </div>
        <span className="tile-palette__total">
          {meldCount}/{handModel.maxDeclaredMelds} 组副露
        </span>
      </div>

      <div className="meld-input-controls__actions">
        {actions.map((action) => {
          const isFlower = action.kind === 'flower';
          const disabled = !isFlower && atMeldLimit;
          const active = activeKind === action.kind;

          return (
            <button
              className={active ? 'mode-action mode-action--active' : 'mode-action'}
              type="button"
              key={`${action.kind}-${action.openKind ?? 'none'}`}
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onStart(action.kind, action.openKind)}
            >
              {action.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
