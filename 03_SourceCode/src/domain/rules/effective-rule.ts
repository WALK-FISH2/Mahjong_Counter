import type { PatternDefinition } from './pattern-definition';
import type { RulePackageDefinition } from './rule-package';
import type { ExtraScoringDefinition, ScoringDefinition } from './scoring-definition';
import type {
  TemporaryAdjustmentDefinition,
  TemporaryAdjustmentValue,
  TemporaryAdjustmentValueConstraint,
} from './temporary-adjustment-definition';

export type EffectiveRuleAdjustment = Readonly<{
  baseRuleRef: Readonly<{ ruleId: string; ruleVersion: string }>;
  values: Readonly<Record<string, unknown>>;
}>;

export type EffectiveRuleIssue = Readonly<{
  reasonCode:
    | 'BASE_RULE_MISMATCH'
    | 'UNDECLARED_ADJUSTMENT'
    | 'INVALID_ADJUSTMENT_VALUE'
    | 'MISSING_ADJUSTMENT_TARGET'
    | 'INVALID_SCORING_CAP';
  adjustmentId?: string;
}>;

export class EffectiveRuleAdjustmentError extends Error {
  readonly issues: readonly EffectiveRuleIssue[];

  constructor(issues: readonly EffectiveRuleIssue[]) {
    super('Temporary rule adjustment cannot be applied.');
    this.name = 'EffectiveRuleAdjustmentError';
    this.issues = Object.freeze([...issues]);
  }
}

function isAllowedValue(
  constraint: TemporaryAdjustmentValueConstraint,
  value: unknown,
): value is TemporaryAdjustmentValue {
  switch (constraint.valueType) {
    case 'boolean':
      return typeof value === 'boolean';
    case 'enum':
      return typeof value === 'string' && constraint.values.includes(value);
    case 'number':
    case 'nullable-number': {
      if (value === null) return constraint.valueType === 'nullable-number';
      if (typeof value !== 'number' || !Number.isFinite(value)) return false;
      if (constraint.integer === true && !Number.isInteger(value)) return false;
      if (constraint.minimum !== undefined && value < constraint.minimum) return false;
      return constraint.maximum === undefined || value <= constraint.maximum;
    }
  }
}

function withPatternValue(
  pattern: PatternDefinition,
  definition: TemporaryAdjustmentDefinition,
  value: TemporaryAdjustmentValue,
): PatternDefinition {
  if (definition.target.module !== 'pattern') return pattern;
  if (definition.target.field === 'enabled') {
    return Object.freeze({ ...pattern, enabled: value as boolean });
  }
  return Object.freeze({ ...pattern, value: value as number });
}

function withExtraValue(
  extra: ExtraScoringDefinition,
  definition: TemporaryAdjustmentDefinition,
  value: TemporaryAdjustmentValue,
): ExtraScoringDefinition {
  if (definition.target.module !== 'scoring-extra') return extra;
  if (definition.target.field === 'mode') {
    return Object.freeze({ ...extra, mode: value as ExtraScoringDefinition['mode'] });
  }
  return Object.freeze({ ...extra, value: value as number });
}

function freezeScoring(scoring: ScoringDefinition): ScoringDefinition {
  return Object.freeze({
    ...scoring,
    ...(scoring.cap === undefined ? {} : { cap: Object.freeze({ ...scoring.cap }) }),
    ...(scoring.extras === undefined
      ? {}
      : { extras: Object.freeze(scoring.extras.map((extra) => Object.freeze({ ...extra }))) }),
  });
}

/**
 * Builds a rule value for one calculation without mutating the installed RulePackage.
 * Only fields explicitly declared by `temporaryAdjustments` can be changed.
 */
export function buildEffectiveRule(
  baseRule: RulePackageDefinition,
  adjustment: EffectiveRuleAdjustment | null,
): RulePackageDefinition {
  if (adjustment === null) return baseRule;

  const issues: EffectiveRuleIssue[] = [];
  if (
    adjustment.baseRuleRef.ruleId !== baseRule.manifest.ruleId ||
    adjustment.baseRuleRef.ruleVersion !== baseRule.manifest.ruleVersion
  ) {
    issues.push(Object.freeze({ reasonCode: 'BASE_RULE_MISMATCH' }));
  }
  if (issues.length > 0) throw new EffectiveRuleAdjustmentError(issues);
  if (Object.keys(adjustment.values).length === 0) return baseRule;

  const definitions = new Map(
    baseRule.temporaryAdjustments.map((definition) => [definition.adjustmentId, definition]),
  );
  const validEntries: [TemporaryAdjustmentDefinition, TemporaryAdjustmentValue][] = [];
  for (const [adjustmentId, value] of Object.entries(adjustment.values)) {
    const definition = definitions.get(adjustmentId);
    if (definition === undefined) {
      issues.push(Object.freeze({ reasonCode: 'UNDECLARED_ADJUSTMENT', adjustmentId }));
    } else if (!isAllowedValue(definition.valueConstraint, value)) {
      issues.push(Object.freeze({ reasonCode: 'INVALID_ADJUSTMENT_VALUE', adjustmentId }));
    } else {
      validEntries.push([definition, value]);
    }
  }
  if (issues.length > 0) throw new EffectiveRuleAdjustmentError(issues);

  let legality = Object.freeze({ ...baseRule.legality });
  let scoring = freezeScoring(baseRule.scoring);
  let patterns = Object.freeze(baseRule.patterns.map((pattern) => Object.freeze({ ...pattern })));

  for (const [definition, value] of validEntries) {
    const target = definition.target;
    switch (target.module) {
      case 'legality':
        legality = Object.freeze({ ...legality, minimumFan: value as number });
        break;
      case 'scoring-cap': {
        const cap = scoring.cap ?? { enabled: false, value: null };
        scoring = Object.freeze({
          ...scoring,
          cap: Object.freeze({
            ...cap,
            [target.field]: value,
          }),
        });
        break;
      }
      case 'scoring-extra': {
        const extras = scoring.extras ?? [];
        if (!extras.some(({ extraId }) => extraId === target.extraId)) {
          issues.push(
            Object.freeze({
              reasonCode: 'MISSING_ADJUSTMENT_TARGET',
              adjustmentId: definition.adjustmentId,
            }),
          );
          break;
        }
        scoring = Object.freeze({
          ...scoring,
          extras: Object.freeze(
            extras.map((extra) =>
              extra.extraId === target.extraId
                ? withExtraValue(extra, definition, value)
                : Object.freeze({ ...extra }),
            ),
          ),
        });
        break;
      }
      case 'pattern':
        if (!patterns.some(({ patternId }) => patternId === target.patternId)) {
          issues.push(
            Object.freeze({
              reasonCode: 'MISSING_ADJUSTMENT_TARGET',
              adjustmentId: definition.adjustmentId,
            }),
          );
          break;
        }
        patterns = Object.freeze(
          patterns.map((pattern) =>
            pattern.patternId === target.patternId
              ? withPatternValue(pattern, definition, value)
              : pattern,
          ),
        );
        break;
    }
  }

  if (scoring.cap?.enabled === true && scoring.cap.value === null) {
    issues.push(Object.freeze({ reasonCode: 'INVALID_SCORING_CAP' }));
  }
  if (issues.length > 0) throw new EffectiveRuleAdjustmentError(issues);

  return Object.freeze({
    ...baseRule,
    patterns,
    scoring,
    legality,
  });
}
