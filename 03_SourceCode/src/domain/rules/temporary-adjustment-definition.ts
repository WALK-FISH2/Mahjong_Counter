export const TEMPORARY_ADJUSTMENT_VALUE_TYPES = [
  'boolean',
  'number',
  'nullable-number',
  'enum',
] as const;

export type TemporaryAdjustmentValueType = (typeof TEMPORARY_ADJUSTMENT_VALUE_TYPES)[number];
export type TemporaryAdjustmentValue = boolean | number | string | null;

export type BooleanAdjustmentConstraint = Readonly<{
  valueType: 'boolean';
}>;

export type NumberAdjustmentConstraint = Readonly<{
  valueType: 'number';
  minimum?: number;
  maximum?: number;
  integer?: boolean;
}>;

export type NullableNumberAdjustmentConstraint = Readonly<{
  valueType: 'nullable-number';
  minimum?: number;
  maximum?: number;
  integer?: boolean;
}>;

export type EnumAdjustmentConstraint = Readonly<{
  valueType: 'enum';
  values: readonly string[];
}>;

export type TemporaryAdjustmentValueConstraint =
  | BooleanAdjustmentConstraint
  | NumberAdjustmentConstraint
  | NullableNumberAdjustmentConstraint
  | EnumAdjustmentConstraint;

export type TemporaryAdjustmentTarget =
  | Readonly<{ module: 'legality'; field: 'minimumFan' }>
  | Readonly<{ module: 'scoring-cap'; field: 'enabled' | 'value' }>
  | Readonly<{
      module: 'scoring-extra';
      extraId: string;
      field: 'mode' | 'value';
    }>
  | Readonly<{
      module: 'pattern';
      patternId: string;
      field: 'enabled' | 'value';
    }>;

export type TemporaryAdjustmentDefinition = Readonly<{
  adjustmentId: string;
  target: TemporaryAdjustmentTarget;
  valueConstraint: TemporaryAdjustmentValueConstraint;
}>;

export type TemporaryAdjustmentValues = Readonly<Record<string, TemporaryAdjustmentValue>>;
