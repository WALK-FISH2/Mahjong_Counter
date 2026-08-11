import type { KnownContextPrimitive, WinMode } from '../mahjong/context';

export const CONTEXT_VALUE_TYPES = ['boolean', 'integer', 'text', 'single-select'] as const;
export const CONTEXT_DISPLAY_GROUPS = ['primary', 'more'] as const;
export const CONTEXT_PREDICATE_OPERATORS = ['equals', 'not-equals'] as const;

export type ContextValueType = (typeof CONTEXT_VALUE_TYPES)[number];
export type ContextDisplayGroup = (typeof CONTEXT_DISPLAY_GROUPS)[number];
export type ContextPredicateOperator = (typeof CONTEXT_PREDICATE_OPERATORS)[number];

export type ContextOptionDefinition = Readonly<{
  value: KnownContextPrimitive;
  labelKey: string;
}>;

export type ContextValuePredicate = Readonly<{
  contextId: string;
  operator: ContextPredicateOperator;
  value: KnownContextPrimitive;
}>;

export type ContextDisplayCondition = Readonly<{
  winModes?: readonly WinMode[];
  allOf?: readonly ContextValuePredicate[];
}>;

export type ContextDefinition = Readonly<{
  contextId: string;
  labelKey: string;
  valueType: ContextValueType;
  required: boolean;
  displayGroup: ContextDisplayGroup;
  applicableWinModes: readonly WinMode[];
  options?: readonly ContextOptionDefinition[];
  displayWhen?: ContextDisplayCondition;
  mutuallyExclusiveWith?: readonly string[];
}>;
