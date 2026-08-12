import type { ChangeEvent } from 'react';

import { isContextDefinitionApplicable } from '../../domain/engine/legality';
import {
  isKnownContextValue,
  type ContextValue,
  type KnownContextPrimitive,
  type WinMode,
} from '../../domain/mahjong';
import type { ContextDefinition } from '../../domain/rules/context-definition';

const COPY: Readonly<Record<string, string>> = Object.freeze({
  'context.seatWind': '门风',
  'context.roundWind': '圈风',
  'context.afterKongReplacement': '杠上开花',
  'context.robbingAddedKong': '抢杠和',
  'context.wallLastDraw': '海底捞月',
  'context.lastDiscardAfterWallExhausted': '河底捞鱼',
  'context.lastTile': '绝张',
  'wind.east': '东风',
  'wind.south': '南风',
  'wind.west': '西风',
  'wind.north': '北风',
  'winds.east': '东风',
  'winds.south': '南风',
  'winds.west': '西风',
  'winds.north': '北风',
});

export type WinContextPanelProps = Readonly<{
  mode: WinMode;
  values: Readonly<Record<string, ContextValue>>;
  definitions: readonly ContextDefinition[];
  missingContextIds: readonly string[];
  removedContextIds: readonly string[];
  onModeChange: (mode: WinMode) => void;
  onValueChange: (contextId: string, value: KnownContextPrimitive) => void;
  onValueClear: (contextId: string) => void;
  onUndoModeChange: () => void;
}>;

function copy(labelKey: string): string {
  return COPY[labelKey] ?? labelKey;
}

function knownValue(value: ContextValue | undefined): KnownContextPrimitive | undefined {
  return value !== undefined && isKnownContextValue(value) ? value.value : undefined;
}

function ContextField({
  definition,
  value,
  missing,
  values,
  onValueChange,
  onValueClear,
}: Readonly<{
  definition: ContextDefinition;
  value: ContextValue | undefined;
  missing: boolean;
  values: Readonly<Record<string, ContextValue>>;
  onValueChange: (contextId: string, value: KnownContextPrimitive) => void;
  onValueClear: (contextId: string) => void;
}>) {
  const actual = knownValue(value);
  const label = copy(definition.labelKey);
  const conflictingId = definition.mutuallyExclusiveWith?.find((contextId) => {
    const conflicting = knownValue(values[contextId]);
    return conflicting === true;
  });
  const describedBy = missing ? `${definition.contextId}-missing` : undefined;

  const clearButton = actual !== undefined && (
    <button
      type="button"
      className="context-field__clear"
      onClick={() => onValueClear(definition.contextId)}
    >
      清除
    </button>
  );

  if (definition.valueType === 'boolean') {
    const isMutuallyExclusive = (definition.mutuallyExclusiveWith?.length ?? 0) > 0;
    return (
      <div className={`context-field${missing ? ' context-field--missing' : ''}`}>
        <label className="context-field__checkbox">
          <input
            type={isMutuallyExclusive ? 'radio' : 'checkbox'}
            name={
              isMutuallyExclusive
                ? `context-mutual-${[definition.contextId, ...(definition.mutuallyExclusiveWith ?? [])].sort().join('-')}`
                : undefined
            }
            checked={actual === true}
            aria-describedby={describedBy}
            onChange={(event) =>
              onValueChange(definition.contextId, isMutuallyExclusive || event.target.checked)
            }
          />
          <span>{label}</span>
        </label>
        {clearButton}
        {conflictingId !== undefined && (
          <span className="context-field__hint">该项与其他条件互斥，选择后会替换冲突项。</span>
        )}
        {missing && <span id={describedBy}>必填</span>}
      </div>
    );
  }

  const handleSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const option = definition.options?.[Number(event.target.value)];
    if (option !== undefined) onValueChange(definition.contextId, option.value);
  };
  const selectedOption = definition.options?.findIndex(({ value: option }) => option === actual);

  return (
    <div className={`context-field${missing ? ' context-field--missing' : ''}`}>
      <label htmlFor={`context-${definition.contextId}`}>{label}</label>
      {definition.valueType === 'single-select' ? (
        <select
          id={`context-${definition.contextId}`}
          value={selectedOption === undefined || selectedOption < 0 ? '' : String(selectedOption)}
          aria-describedby={describedBy}
          onChange={handleSelect}
        >
          <option value="">请选择</option>
          {definition.options?.map((option, index) => (
            <option key={String(option.value)} value={index}>
              {copy(option.labelKey)}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={`context-${definition.contextId}`}
          type={definition.valueType === 'integer' ? 'number' : 'text'}
          value={actual === undefined ? '' : String(actual)}
          aria-describedby={describedBy}
          onChange={(event) => {
            const value =
              definition.valueType === 'integer' ? Number(event.target.value) : event.target.value;
            onValueChange(definition.contextId, value);
          }}
        />
      )}
      {clearButton}
      {missing && <span id={describedBy}>必填</span>}
    </div>
  );
}

export function WinContextPanel({
  mode,
  values,
  definitions,
  missingContextIds,
  removedContextIds,
  onModeChange,
  onValueChange,
  onValueClear,
  onUndoModeChange,
}: WinContextPanelProps) {
  const applicable = definitions.filter((definition) =>
    isContextDefinitionApplicable(definition, { mode, values }),
  );
  const primary = applicable.filter(({ displayGroup }) => displayGroup === 'primary');
  const more = applicable.filter(({ displayGroup }) => displayGroup === 'more');
  const missingLabels = definitions
    .filter(({ contextId }) => missingContextIds.includes(contextId))
    .map(({ labelKey }) => copy(labelKey));

  const renderField = (definition: ContextDefinition) => (
    <ContextField
      key={definition.contextId}
      definition={definition}
      value={values[definition.contextId]}
      values={values}
      missing={missingContextIds.includes(definition.contextId)}
      onValueChange={onValueChange}
      onValueClear={onValueClear}
    />
  );

  return (
    <section className="calculator-panel win-context" aria-labelledby="context-title">
      <p className="section-kicker">当前计算条件</p>
      <h2 id="context-title">和牌条件</h2>

      <fieldset className="win-context__mode">
        <legend>和牌方式</legend>
        <label>
          <input
            type="radio"
            name="win-mode"
            value="discard"
            checked={mode === 'discard'}
            onChange={() => onModeChange('discard')}
          />
          点炮
        </label>
        <label>
          <input
            type="radio"
            name="win-mode"
            value="self-draw"
            checked={mode === 'self-draw'}
            onChange={() => onModeChange('self-draw')}
          />
          自摸
        </label>
      </fieldset>

      {removedContextIds.length > 0 && (
        <div className="context-removal-notice" role="status">
          <span>切换方式后已清除 {removedContextIds.length} 个不适用条件。</span>
          <button type="button" className="secondary-action" onClick={onUndoModeChange}>
            撤销切换
          </button>
        </div>
      )}

      <div className="win-context__fields">{primary.map(renderField)}</div>

      {more.length > 0 && (
        <details className="win-context__more">
          <summary>更多条件</summary>
          <div className="win-context__fields">{more.map(renderField)}</div>
        </details>
      )}

      {missingContextIds.length > 0 && (
        <p className="missing-context-prompt" role="alert">
          还需补全：{missingLabels.join('、')}；补全前不会形成正式结果。
        </p>
      )}
    </section>
  );
}
