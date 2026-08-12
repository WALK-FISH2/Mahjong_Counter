import { isKnownContextValue, type WinContext } from '../../mahjong/context';
import type { ContextDefinition, ContextValuePredicate } from '../../rules/context-definition';
import type { LegalityDefinition } from '../../rules/legality-definition';

export type LegalityReason = Readonly<{
  reasonCode: 'MINIMUM_FAN_NOT_MET';
  data: Readonly<{
    actualFan: number;
    minimumFan: number;
  }>;
}>;

export type LegalityResult =
  | Readonly<{ status: 'legal' }>
  | Readonly<{ status: 'illegal'; reasons: readonly LegalityReason[] }>
  | Readonly<{ status: 'incomplete-context'; missingContextIds: readonly string[] }>;

function predicateMatches(context: WinContext, predicate: ContextValuePredicate): boolean {
  const contextValue = context.values[predicate.contextId];
  const actual =
    contextValue !== undefined && isKnownContextValue(contextValue) ? contextValue.value : null;
  return predicate.operator === 'equals' ? actual === predicate.value : actual !== predicate.value;
}

export function isContextDefinitionApplicable(
  definition: ContextDefinition,
  context: WinContext,
): boolean {
  if (!definition.applicableWinModes.includes(context.mode)) {
    return false;
  }
  const displayWhen = definition.displayWhen;
  if (displayWhen?.winModes !== undefined && !displayWhen.winModes.includes(context.mode)) {
    return false;
  }
  return displayWhen?.allOf?.every((predicate) => predicateMatches(context, predicate)) ?? true;
}

export function getMissingRequiredContextIds(
  context: WinContext,
  definitions: readonly ContextDefinition[],
): readonly string[] {
  return Object.freeze(
    definitions
      .filter(({ required }) => required)
      .filter((definition) => isContextDefinitionApplicable(definition, context))
      .filter(({ contextId }) => {
        const value = context.values[contextId];
        return value === undefined || !isKnownContextValue(value);
      })
      .map(({ contextId }) => contextId)
      .sort(),
  );
}

export function evaluateLegality(
  score: number,
  definition: LegalityDefinition,
  contextDefinitions: readonly ContextDefinition[],
  context: WinContext,
): LegalityResult {
  const missingContextIds = getMissingRequiredContextIds(context, contextDefinitions);
  if (missingContextIds.length > 0) {
    return Object.freeze({ status: definition.onMissingRequiredContext, missingContextIds });
  }
  if (score < definition.minimumFan) {
    return Object.freeze({
      status: 'illegal',
      reasons: Object.freeze([
        Object.freeze({
          reasonCode: 'MINIMUM_FAN_NOT_MET',
          data: Object.freeze({ actualFan: score, minimumFan: definition.minimumFan }),
        }),
      ]),
    });
  }
  return Object.freeze({ status: 'legal' });
}
