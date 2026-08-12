import { isKnownContextValue, type WinContext } from '../../mahjong/context';
import type { HandSnapshot } from '../../mahjong/hand';
import { countHandTilesByCode } from '../../mahjong/validation';
import type { ExtraScoringDefinition, ScoringDefinition } from '../../rules/scoring-definition';
import type { TileSetDefinition } from '../../rules/tile-set';
import type { ResolvedPattern } from '../relation/pattern-relation-resolver';
import type { BaseScore } from './scoring-strategy';

export type ExtraScoringInput = Readonly<{
  hand: HandSnapshot;
  context: WinContext;
  tileSet: TileSetDefinition;
  countedPatterns: readonly ResolvedPattern[];
}>;

export type ExtraScoringCalculator = Readonly<{
  calculatorKey: string;
  calculateOccurrences: (definition: ExtraScoringDefinition, input: ExtraScoringInput) => number;
}>;

export type ExtraScoringCalculatorRegistry = Readonly<{
  calculators: readonly ExtraScoringCalculator[];
}>;

export type ExtraScoreItem = Readonly<{
  extraId: string;
  calculatorKey: string;
  patternId: string;
  occurrences: number;
  unitValue: number;
  subtotal: number;
  unit: string;
  capPlacement: ExtraScoringDefinition['capPlacement'];
}>;

export type ScoreBreakdown = Readonly<{
  strategyKey: string;
  unit: string;
  base: BaseScore;
  extrasBeforeCap: readonly ExtraScoreItem[];
  extrasAfterCap: readonly ExtraScoreItem[];
  totalBeforeCap: number;
  cap: Readonly<{
    enabled: boolean;
    value: number | null;
    applied: boolean;
    subtotalAfterCap: number;
  }>;
  total: number;
}>;

export class ExtraScoringCalculatorUnavailableError extends Error {
  constructor(readonly calculatorKey: string) {
    super(`Extra scoring calculator is unavailable: ${calculatorKey}`);
    this.name = 'ExtraScoringCalculatorUnavailableError';
  }
}

function requiredStringParameter(
  definition: ExtraScoringDefinition,
  parameterName: string,
): string {
  const value = definition.parameters[parameterName];
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(
      `Extra ${definition.extraId} requires a non-empty ${parameterName} parameter.`,
    );
  }
  return value;
}

function hasCountedPattern(input: ExtraScoringInput, patternId: string): boolean {
  return input.countedPatterns.some(({ candidate }) => candidate.patternId === patternId);
}

function contextPrimitive(
  context: WinContext,
  contextId: string,
): boolean | number | string | null {
  if (contextId === 'winMode') {
    return context.mode;
  }
  const value = context.values[contextId];
  return value !== undefined && isKnownContextValue(value) ? value.value : null;
}

export const contextMatchExtraScoringCalculator: ExtraScoringCalculator = Object.freeze({
  calculatorKey: 'scoring.extra.context-match',
  calculateOccurrences: (definition, input) => {
    const patternId = requiredStringParameter(definition, 'patternId');
    const contextId = requiredStringParameter(definition, 'contextId');
    const expected = definition.parameters.equals;
    if (
      typeof expected !== 'boolean' &&
      typeof expected !== 'number' &&
      typeof expected !== 'string'
    ) {
      throw new TypeError(`Extra ${definition.extraId} requires a primitive equals parameter.`);
    }
    return hasCountedPattern(input, patternId) &&
      contextPrimitive(input.context, contextId) === expected
      ? 1
      : 0;
  },
});

export const tileGroupCountExtraScoringCalculator: ExtraScoringCalculator = Object.freeze({
  calculatorKey: 'scoring.extra.tile-group-count',
  calculateOccurrences: (definition, input) => {
    const patternId = requiredStringParameter(definition, 'patternId');
    const tileGroupId = requiredStringParameter(definition, 'tileGroupId');
    if (!hasCountedPattern(input, patternId)) {
      return 0;
    }
    const group = input.tileSet.groups.find(({ id }) => id === tileGroupId);
    if (group === undefined) {
      throw new RangeError(
        `Extra ${definition.extraId} references unknown tile group ${tileGroupId}.`,
      );
    }
    const counts = countHandTilesByCode(input.hand);
    return group.tiles.reduce((total, tile) => total + (counts[tile] ?? 0), 0);
  },
});

export function createExtraScoringCalculatorRegistry(
  calculators: readonly ExtraScoringCalculator[],
): ExtraScoringCalculatorRegistry {
  const seen = new Set<string>();
  const copied = calculators.map((calculator) => {
    if (calculator.calculatorKey.length === 0 || seen.has(calculator.calculatorKey)) {
      throw new RangeError(
        `Invalid or duplicate extra calculator key: ${calculator.calculatorKey}`,
      );
    }
    seen.add(calculator.calculatorKey);
    return Object.freeze({ ...calculator });
  });
  return Object.freeze({ calculators: Object.freeze(copied) });
}

function scoreExtra(
  definition: ExtraScoringDefinition,
  input: ExtraScoringInput,
  registry: ExtraScoringCalculatorRegistry,
  unit: string,
): ExtraScoreItem | null {
  const calculator = registry.calculators.find(
    ({ calculatorKey }) => calculatorKey === definition.calculatorKey,
  );
  if (calculator === undefined) {
    throw new ExtraScoringCalculatorUnavailableError(definition.calculatorKey);
  }
  const occurrences = calculator.calculateOccurrences(definition, input);
  if (!Number.isSafeInteger(occurrences) || occurrences < 0) {
    throw new RangeError(`Extra ${definition.extraId} produced an invalid occurrence count.`);
  }
  if (occurrences === 0) {
    return null;
  }
  const patternId = requiredStringParameter(definition, 'patternId');
  return Object.freeze({
    extraId: definition.extraId,
    calculatorKey: definition.calculatorKey,
    patternId,
    occurrences,
    unitValue: definition.value,
    subtotal: occurrences * definition.value,
    unit,
    capPlacement: definition.capPlacement,
  });
}

export function applyCapAndExtras(
  base: BaseScore,
  scoring: ScoringDefinition,
  input: ExtraScoringInput,
  registry: ExtraScoringCalculatorRegistry,
): ScoreBreakdown {
  const extraPatternIds = new Set(
    (scoring.extras ?? []).flatMap((definition) => {
      const patternId = definition.parameters.patternId;
      return typeof patternId === 'string' ? [patternId] : [];
    }),
  );
  const baseItems = Object.freeze(
    base.items.filter(({ patternId }) => !extraPatternIds.has(patternId)),
  );
  const extractedExtraSubtotal = base.items
    .filter(({ patternId }) => extraPatternIds.has(patternId))
    .reduce((total, item) => total + item.subtotal, 0);
  const normalizedBase = Object.freeze({
    ...base,
    items: baseItems,
    total: base.total - extractedExtraSubtotal,
  });
  const items = Object.freeze(
    (scoring.extras ?? []).flatMap((definition) => {
      const item = scoreExtra(definition, input, registry, scoring.unit);
      return item === null ? [] : [item];
    }),
  );
  const extrasBeforeCap = Object.freeze(
    items.filter(({ capPlacement }) => capPlacement === 'before-cap'),
  );
  const extrasAfterCap = Object.freeze(
    items.filter(({ capPlacement }) => capPlacement === 'after-cap'),
  );
  const totalBeforeCap =
    normalizedBase.total + extrasBeforeCap.reduce((total, item) => total + item.subtotal, 0);
  const capDefinition = scoring.cap ?? { enabled: false, value: null };
  if (capDefinition.enabled && capDefinition.value === null) {
    throw new TypeError('An enabled scoring cap requires a numeric value.');
  }
  const applied =
    capDefinition.enabled && capDefinition.value !== null && totalBeforeCap > capDefinition.value;
  const subtotalAfterCap = applied ? capDefinition.value : totalBeforeCap;
  const total = subtotalAfterCap + extrasAfterCap.reduce((sum, item) => sum + item.subtotal, 0);

  return Object.freeze({
    strategyKey: base.strategyKey,
    unit: scoring.unit,
    base: normalizedBase,
    extrasBeforeCap,
    extrasAfterCap,
    totalBeforeCap,
    cap: Object.freeze({
      enabled: capDefinition.enabled,
      value: capDefinition.value,
      applied,
      subtotalAfterCap,
    }),
    total,
  });
}
