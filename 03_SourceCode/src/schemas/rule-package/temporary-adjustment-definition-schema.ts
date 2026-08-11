import { z } from 'zod';

import type {
  EnumAdjustmentConstraint,
  NullableNumberAdjustmentConstraint,
  NumberAdjustmentConstraint,
  TemporaryAdjustmentDefinition,
  TemporaryAdjustmentTarget,
  TemporaryAdjustmentValueConstraint,
  TemporaryAdjustmentValues,
} from '../../domain/rules/temporary-adjustment-definition';

const MAX_TEMPORARY_ADJUSTMENT_DEFINITIONS = 512;
const stableIdSchema = z.string().trim().min(1).max(128);
const boundedNumberSchema = z.number().finite().safe();

const temporaryAdjustmentTargetSchema = z.discriminatedUnion('module', [
  z.strictObject({ module: z.literal('legality'), field: z.literal('minimumFan') }),
  z.strictObject({
    module: z.literal('scoring-cap'),
    field: z.enum(['enabled', 'value']),
  }),
  z.strictObject({
    module: z.literal('scoring-extra'),
    extraId: stableIdSchema,
    field: z.enum(['mode', 'value']),
  }),
  z.strictObject({
    module: z.literal('pattern'),
    patternId: stableIdSchema,
    field: z.enum(['enabled', 'value']),
  }),
]) satisfies z.ZodType<TemporaryAdjustmentTarget>;

const numberConstraintFields = {
  minimum: boundedNumberSchema.optional(),
  maximum: boundedNumberSchema.optional(),
  integer: z.boolean().optional(),
};

const numberAdjustmentConstraintSchema = z
  .strictObject({
    valueType: z.literal('number'),
    ...numberConstraintFields,
  })
  .superRefine(addNumericBoundsIssues)
  .transform((constraint): NumberAdjustmentConstraint => ({
    valueType: constraint.valueType,
    ...(constraint.minimum === undefined ? {} : { minimum: constraint.minimum }),
    ...(constraint.maximum === undefined ? {} : { maximum: constraint.maximum }),
    ...(constraint.integer === undefined ? {} : { integer: constraint.integer }),
  }));

const nullableNumberAdjustmentConstraintSchema = z
  .strictObject({
    valueType: z.literal('nullable-number'),
    ...numberConstraintFields,
  })
  .superRefine(addNumericBoundsIssues)
  .transform((constraint): NullableNumberAdjustmentConstraint => ({
    valueType: constraint.valueType,
    ...(constraint.minimum === undefined ? {} : { minimum: constraint.minimum }),
    ...(constraint.maximum === undefined ? {} : { maximum: constraint.maximum }),
    ...(constraint.integer === undefined ? {} : { integer: constraint.integer }),
  }));

const temporaryAdjustmentValueConstraintSchema = z.union([
  z.strictObject({ valueType: z.literal('boolean') }),
  numberAdjustmentConstraintSchema,
  nullableNumberAdjustmentConstraintSchema,
  z
    .strictObject({
      valueType: z.literal('enum'),
      values: z
        .array(z.string().trim().min(1).max(128))
        .min(1)
        .max(128)
        .superRefine((values, context) => {
          if (new Set(values).size !== values.length) {
            context.addIssue({ code: 'custom', message: 'enum values must be unique' });
          }
        }),
    })
    .transform((constraint): EnumAdjustmentConstraint => ({
      valueType: constraint.valueType,
      values: constraint.values,
    })),
]) satisfies z.ZodType<TemporaryAdjustmentValueConstraint>;

function addNumericBoundsIssues(
  constraint: { minimum?: number | undefined; maximum?: number | undefined },
  context: z.RefinementCtx,
): void {
  if (
    constraint.minimum !== undefined &&
    constraint.maximum !== undefined &&
    constraint.minimum > constraint.maximum
  ) {
    context.addIssue({
      code: 'custom',
      message: 'minimum must not exceed maximum',
      path: ['minimum'],
    });
  }
}

function expectedValueType(target: TemporaryAdjustmentTarget): string {
  if (target.module === 'legality') {
    return 'number';
  }
  if (target.module === 'scoring-cap') {
    return target.field === 'enabled' ? 'boolean' : 'nullable-number';
  }
  if (target.module === 'scoring-extra') {
    return target.field === 'mode' ? 'enum' : 'number';
  }
  return target.field === 'enabled' ? 'boolean' : 'number';
}

function targetKey(target: TemporaryAdjustmentTarget): string {
  if (target.module === 'scoring-extra') {
    return `${target.module}:${target.extraId}:${target.field}`;
  }
  if (target.module === 'pattern') {
    return `${target.module}:${target.patternId}:${target.field}`;
  }
  return `${target.module}:${target.field}`;
}

export const temporaryAdjustmentDefinitionSchema = z
  .strictObject({
    adjustmentId: stableIdSchema,
    target: temporaryAdjustmentTargetSchema,
    valueConstraint: temporaryAdjustmentValueConstraintSchema,
  })
  .superRefine((definition, context) => {
    const expected = expectedValueType(definition.target);
    if (definition.valueConstraint.valueType !== expected) {
      context.addIssue({
        code: 'custom',
        message: `target requires a ${expected} value constraint`,
        path: ['valueConstraint', 'valueType'],
      });
    }
  })
  .transform((definition): TemporaryAdjustmentDefinition => ({
    adjustmentId: definition.adjustmentId,
    target: definition.target,
    valueConstraint: definition.valueConstraint,
  })) satisfies z.ZodType<TemporaryAdjustmentDefinition>;

export const temporaryAdjustmentDefinitionsSchema = z
  .array(temporaryAdjustmentDefinitionSchema)
  .max(MAX_TEMPORARY_ADJUSTMENT_DEFINITIONS)
  .superRefine((definitions, context) => {
    const adjustmentIds = new Set<string>();
    const targets = new Set<string>();

    definitions.forEach((definition, index) => {
      if (adjustmentIds.has(definition.adjustmentId)) {
        context.addIssue({
          code: 'custom',
          message: 'temporary adjustment IDs must be unique',
          path: [index, 'adjustmentId'],
        });
      }
      adjustmentIds.add(definition.adjustmentId);

      const key = targetKey(definition.target);
      if (targets.has(key)) {
        context.addIssue({
          code: 'custom',
          message: 'temporary adjustment targets must be unique',
          path: [index, 'target'],
        });
      }
      targets.add(key);
    });
  });

const adjustmentValueSchema = z.union([
  z.boolean(),
  boundedNumberSchema,
  z.string().max(128),
  z.null(),
]);

function isAllowedValue(
  constraint: TemporaryAdjustmentValueConstraint,
  value: boolean | number | string | null,
): boolean {
  if (constraint.valueType === 'boolean') {
    return typeof value === 'boolean';
  }
  if (constraint.valueType === 'enum') {
    return typeof value === 'string' && constraint.values.includes(value);
  }
  if (value === null) {
    return constraint.valueType === 'nullable-number';
  }
  if (typeof value !== 'number') {
    return false;
  }
  if (constraint.minimum !== undefined && value < constraint.minimum) {
    return false;
  }
  if (constraint.maximum !== undefined && value > constraint.maximum) {
    return false;
  }
  return constraint.integer !== true || Number.isInteger(value);
}

export function createTemporaryAdjustmentValuesSchema(
  definitions: readonly TemporaryAdjustmentDefinition[],
): z.ZodType<TemporaryAdjustmentValues> {
  const definitionsById = new Map(
    definitions.map((definition) => [definition.adjustmentId, definition]),
  );

  return z.record(stableIdSchema, adjustmentValueSchema).superRefine((values, context) => {
    Object.entries(values).forEach(([adjustmentId, value]) => {
      const definition = definitionsById.get(adjustmentId);
      if (definition === undefined) {
        context.addIssue({
          code: 'custom',
          message: 'adjustment is not declared by the active rule',
          path: [adjustmentId],
        });
        return;
      }

      if (!isAllowedValue(definition.valueConstraint, value)) {
        context.addIssue({
          code: 'custom',
          message: 'adjustment value violates its declared constraint',
          path: [adjustmentId],
        });
      }
    });
  });
}

export function parseTemporaryAdjustmentDefinitions(
  input: unknown,
): readonly TemporaryAdjustmentDefinition[] {
  return temporaryAdjustmentDefinitionsSchema.parse(input);
}

export function parseTemporaryAdjustmentValues(
  definitions: readonly TemporaryAdjustmentDefinition[],
  input: unknown,
): TemporaryAdjustmentValues {
  return createTemporaryAdjustmentValuesSchema(definitions).parse(input);
}
