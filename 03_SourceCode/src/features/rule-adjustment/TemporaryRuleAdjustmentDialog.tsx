import { useMemo, useState } from 'react';

import {
  buildEffectiveRule,
  EffectiveRuleAdjustmentError,
} from '../../domain/rules/effective-rule';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import type {
  TemporaryAdjustmentDefinition,
  TemporaryAdjustmentValue,
  TemporaryAdjustmentValues,
} from '../../domain/rules/temporary-adjustment-definition';

export type TemporaryRuleAdjustmentDialogProps = Readonly<{
  rulePackage: RulePackageDefinition;
  currentValues: Readonly<Record<string, unknown>>;
  onApply: (values: TemporaryAdjustmentValues) => void;
  onRestore: () => void;
  onClose: () => void;
}>;

function defaultValue(
  rulePackage: RulePackageDefinition,
  definition: TemporaryAdjustmentDefinition,
): TemporaryAdjustmentValue {
  const target = definition.target;
  switch (target.module) {
    case 'legality':
      return rulePackage.legality.minimumFan;
    case 'scoring-cap':
      return target.field === 'enabled'
        ? (rulePackage.scoring.cap?.enabled ?? false)
        : (rulePackage.scoring.cap?.value ?? null);
    case 'scoring-extra': {
      const extra = rulePackage.scoring.extras?.find(({ extraId }) => extraId === target.extraId);
      return target.field === 'mode' ? (extra?.mode ?? '') : (extra?.value ?? 0);
    }
    case 'pattern': {
      const pattern = rulePackage.patterns.find(({ patternId }) => patternId === target.patternId);
      return target.field === 'enabled' ? (pattern?.enabled ?? false) : Number(pattern?.value ?? 0);
    }
  }
}

function labelFor(rulePackage: RulePackageDefinition, definition: TemporaryAdjustmentDefinition) {
  const target = definition.target;
  switch (target.module) {
    case 'legality':
      return '最低起胡值';
    case 'scoring-cap':
      return target.field === 'enabled' ? '启用封顶' : '封顶值';
    case 'scoring-extra': {
      const extra = rulePackage.scoring.extras?.find(({ extraId }) => extraId === target.extraId);
      const patternId = extra?.parameters.patternId;
      const name = rulePackage.patterns.find(({ patternId: id }) => id === patternId)?.name;
      return `${name ?? target.extraId}${target.field === 'mode' ? '计算方式' : '每次番值'}`;
    }
    case 'pattern': {
      const name = rulePackage.patterns.find(
        ({ patternId }) => patternId === target.patternId,
      )?.name;
      return `${name ?? target.patternId}${target.field === 'enabled' ? '是否启用' : '番值'}`;
    }
  }
}

function sameValue(left: unknown, right: TemporaryAdjustmentValue): boolean {
  return left === right;
}

function initialValues(
  rulePackage: RulePackageDefinition,
  currentValues: Readonly<Record<string, unknown>>,
): Record<string, TemporaryAdjustmentValue> {
  return Object.fromEntries(
    rulePackage.temporaryAdjustments.map((definition) => {
      const existing = currentValues[definition.adjustmentId];
      const fallback = defaultValue(rulePackage, definition);
      return [
        definition.adjustmentId,
        typeof existing === 'boolean' ||
        typeof existing === 'number' ||
        typeof existing === 'string' ||
        existing === null
          ? existing
          : fallback,
      ];
    }),
  );
}

export function TemporaryRuleAdjustmentDialog({
  rulePackage,
  currentValues,
  onApply,
  onRestore,
  onClose,
}: TemporaryRuleAdjustmentDialogProps) {
  const [values, setValues] = useState(() => initialValues(rulePackage, currentValues));
  const [error, setError] = useState<string | null>(null);
  const general = useMemo(
    () => rulePackage.temporaryAdjustments.filter(({ target }) => target.module !== 'pattern'),
    [rulePackage],
  );
  const patterns = useMemo(
    () => rulePackage.temporaryAdjustments.filter(({ target }) => target.module === 'pattern'),
    [rulePackage],
  );

  const renderField = (definition: TemporaryAdjustmentDefinition) => {
    const value = values[definition.adjustmentId] ?? defaultValue(rulePackage, definition);
    const constraint = definition.valueConstraint;
    return (
      <label className="adjustment-field" key={definition.adjustmentId}>
        <span>{labelFor(rulePackage, definition)}</span>
        {constraint.valueType === 'boolean' ? (
          <input
            type="checkbox"
            data-adjustment-id={definition.adjustmentId}
            checked={value === true}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [definition.adjustmentId]: event.target.checked,
              }))
            }
          />
        ) : constraint.valueType === 'enum' ? (
          <select
            data-adjustment-id={definition.adjustmentId}
            value={String(value)}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [definition.adjustmentId]: event.target.value,
              }))
            }
          >
            {constraint.values.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            data-adjustment-id={definition.adjustmentId}
            min={constraint.minimum}
            max={constraint.maximum}
            step={constraint.integer === true ? 1 : 'any'}
            value={value === null ? '' : Number(value)}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [definition.adjustmentId]:
                  event.target.value === '' && constraint.valueType === 'nullable-number'
                    ? null
                    : event.target.valueAsNumber,
              }))
            }
          />
        )}
      </label>
    );
  };

  return (
    <div className="dialog-backdrop">
      <form
        className="calculator-dialog adjustment-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="temporary-adjustment-title"
        onSubmit={(event) => {
          event.preventDefault();
          const overrides = Object.fromEntries(
            rulePackage.temporaryAdjustments.flatMap((definition) => {
              const value = values[definition.adjustmentId];
              return value !== undefined && !sameValue(value, defaultValue(rulePackage, definition))
                ? [[definition.adjustmentId, value]]
                : [];
            }),
          );
          try {
            buildEffectiveRule(rulePackage, {
              baseRuleRef: rulePackage.manifest,
              values: overrides,
            });
            onApply(Object.freeze(overrides));
          } catch (reason) {
            setError(
              reason instanceof EffectiveRuleAdjustmentError
                ? '调整值不符合当前规则声明，请检查后重试。'
                : '无法应用本次规则调整。',
            );
          }
        }}
      >
        <h2 id="temporary-adjustment-title">临时规则调整</h2>
        <p>这些设置只作用于当前牌例，不会修改已安装的规则包。</p>
        <div className="adjustment-fields">{general.map(renderField)}</div>
        {patterns.length > 0 && (
          <details className="adjustment-patterns">
            <summary>番型启用与番值（{patterns.length} 项）</summary>
            <div className="adjustment-fields">{patterns.map(renderField)}</div>
          </details>
        )}
        {error !== null && <p role="alert">{error}</p>}
        <div className="dialog-actions">
          <button className="primary-action" type="submit">
            应用本次规则
          </button>
          <button className="secondary-action" type="button" onClick={onRestore}>
            恢复系统预设
          </button>
          <button className="secondary-action" type="button" onClick={onClose}>
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
