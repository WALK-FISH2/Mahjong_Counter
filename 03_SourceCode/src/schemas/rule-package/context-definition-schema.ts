import { z } from 'zod';

import { type KnownContextPrimitive, type WinMode } from '../../domain/mahjong/context';
import {
  CONTEXT_DISPLAY_GROUPS,
  CONTEXT_PREDICATE_OPERATORS,
  CONTEXT_VALUE_TYPES,
  type ContextDefinition,
  type ContextDisplayCondition,
} from '../../domain/rules/context-definition';

const MAX_CONTEXT_DEFINITIONS = 256;
const identifierSchema = z.string().trim().min(1).max(128);
const winModeSchema = z.enum(['discard', 'self-draw'] satisfies readonly WinMode[]);
const contextPrimitiveSchema = z.union([
  z.boolean(),
  z.number().finite().safe(),
  z.string().max(512),
]);

const contextOptionSchema = z.strictObject({
  value: contextPrimitiveSchema,
  labelKey: z.string().trim().min(1).max(256),
});

const contextValuePredicateSchema = z.strictObject({
  contextId: identifierSchema,
  operator: z.enum(CONTEXT_PREDICATE_OPERATORS),
  value: contextPrimitiveSchema,
});

const contextDisplayConditionSchema = z
  .strictObject({
    winModes: z.array(winModeSchema).min(1).max(2).optional(),
    allOf: z.array(contextValuePredicateSchema).min(1).max(MAX_CONTEXT_DEFINITIONS).optional(),
  })
  .superRefine((condition, context) => {
    if (condition.winModes === undefined && condition.allOf === undefined) {
      context.addIssue({ code: 'custom', message: 'display condition cannot be empty' });
    }

    if (
      condition.winModes !== undefined &&
      new Set(condition.winModes).size !== condition.winModes.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'display condition winModes must be unique',
        path: ['winModes'],
      });
    }
  })
  .transform((condition): ContextDisplayCondition => ({
    ...(condition.winModes === undefined ? {} : { winModes: condition.winModes }),
    ...(condition.allOf === undefined ? {} : { allOf: condition.allOf }),
  }));

export const contextDefinitionSchema = z
  .strictObject({
    contextId: identifierSchema,
    labelKey: z.string().trim().min(1).max(256),
    valueType: z.enum(CONTEXT_VALUE_TYPES),
    required: z.boolean(),
    displayGroup: z.enum(CONTEXT_DISPLAY_GROUPS),
    applicableWinModes: z.array(winModeSchema).min(1).max(2),
    options: z.array(contextOptionSchema).min(1).max(256).optional(),
    displayWhen: contextDisplayConditionSchema.optional(),
    mutuallyExclusiveWith: z.array(identifierSchema).max(MAX_CONTEXT_DEFINITIONS).optional(),
  })
  .superRefine((definition, context) => {
    if (new Set(definition.applicableWinModes).size !== definition.applicableWinModes.length) {
      context.addIssue({
        code: 'custom',
        message: 'applicableWinModes must be unique',
        path: ['applicableWinModes'],
      });
    }

    if (definition.valueType === 'single-select' && definition.options === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'single-select contexts require options',
        path: ['options'],
      });
    }

    if (definition.valueType !== 'single-select' && definition.options !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'only single-select contexts may declare options',
        path: ['options'],
      });
    }

    if (definition.options !== undefined) {
      const optionValues = new Set<string>();
      definition.options.forEach((option, index) => {
        const key = `${typeof option.value}:${String(option.value)}`;
        if (optionValues.has(key)) {
          context.addIssue({
            code: 'custom',
            message: 'context option values must be unique',
            path: ['options', index, 'value'],
          });
        }
        optionValues.add(key);
      });
    }

    if (
      definition.mutuallyExclusiveWith !== undefined &&
      new Set(definition.mutuallyExclusiveWith).size !== definition.mutuallyExclusiveWith.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'mutuallyExclusiveWith must be unique',
        path: ['mutuallyExclusiveWith'],
      });
    }

    definition.displayWhen?.winModes?.forEach((mode, index) => {
      if (!definition.applicableWinModes.includes(mode)) {
        context.addIssue({
          code: 'custom',
          message: 'display winModes must also be applicable winModes',
          path: ['displayWhen', 'winModes', index],
        });
      }
    });
  })
  .transform((definition): ContextDefinition => ({
    contextId: definition.contextId,
    labelKey: definition.labelKey,
    valueType: definition.valueType,
    required: definition.required,
    displayGroup: definition.displayGroup,
    applicableWinModes: definition.applicableWinModes,
    ...(definition.options === undefined ? {} : { options: definition.options }),
    ...(definition.displayWhen === undefined ? {} : { displayWhen: definition.displayWhen }),
    ...(definition.mutuallyExclusiveWith === undefined
      ? {}
      : { mutuallyExclusiveWith: definition.mutuallyExclusiveWith }),
  })) satisfies z.ZodType<ContextDefinition>;

function primitiveMatchesDefinition(
  value: KnownContextPrimitive,
  definition: ContextDefinition,
): boolean {
  switch (definition.valueType) {
    case 'boolean':
      return typeof value === 'boolean';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'text':
      return typeof value === 'string';
    case 'single-select':
      return definition.options?.some((option) => Object.is(option.value, value)) ?? false;
  }
}

export const contextDefinitionsSchema = z
  .array(contextDefinitionSchema)
  .max(MAX_CONTEXT_DEFINITIONS)
  .superRefine((definitions, context) => {
    const byId = new Map(definitions.map((definition) => [definition.contextId, definition]));

    definitions.forEach((definition, definitionIndex) => {
      if (byId.get(definition.contextId) !== definition) {
        context.addIssue({
          code: 'custom',
          message: 'context IDs must be unique',
          path: [definitionIndex, 'contextId'],
        });
      }

      definition.mutuallyExclusiveWith?.forEach((otherId, otherIndex) => {
        if (otherId === definition.contextId || !byId.has(otherId)) {
          context.addIssue({
            code: 'custom',
            message: 'mutual exclusion must reference another declared context',
            path: [definitionIndex, 'mutuallyExclusiveWith', otherIndex],
          });
        }
      });

      definition.displayWhen?.allOf?.forEach((predicate, predicateIndex) => {
        const referenced = byId.get(predicate.contextId);
        if (referenced === undefined || referenced.contextId === definition.contextId) {
          context.addIssue({
            code: 'custom',
            message: 'display predicates must reference another declared context',
            path: [definitionIndex, 'displayWhen', 'allOf', predicateIndex, 'contextId'],
          });
          return;
        }

        if (!primitiveMatchesDefinition(predicate.value, referenced)) {
          context.addIssue({
            code: 'custom',
            message: 'display predicate value must match the referenced context type',
            path: [definitionIndex, 'displayWhen', 'allOf', predicateIndex, 'value'],
          });
        }
      });
    });
  });

export function parseContextDefinitions(input: unknown): readonly ContextDefinition[] {
  return contextDefinitionsSchema.parse(input);
}
