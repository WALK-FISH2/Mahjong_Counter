import { z } from 'zod';

import {
  EXTRA_CAP_PLACEMENTS,
  EXTRA_SCORING_MODES,
  type CapDefinition,
  type ExtraScoringDefinition,
  type ScoringDefinition,
} from '../../domain/rules/scoring-definition';
import { ruleDataObjectSchema } from './rule-data-schema';

const MAX_EXTRA_SCORING_DEFINITIONS = 128;
const stableIdSchema = z.string().trim().min(1).max(128);
const scoreValueSchema = z.number().finite().safe();

export const capDefinitionSchema = z
  .strictObject({
    enabled: z.boolean(),
    value: z.number().finite().safe().nonnegative().nullable(),
  })
  .superRefine((cap, context) => {
    if (cap.enabled && cap.value === null) {
      context.addIssue({
        code: 'custom',
        message: 'an enabled cap requires a numeric value',
        path: ['value'],
      });
    }

    if (!cap.enabled && cap.value !== null) {
      context.addIssue({
        code: 'custom',
        message: 'a disabled cap must use a null value',
        path: ['value'],
      });
    }
  }) satisfies z.ZodType<CapDefinition>;

export const extraScoringDefinitionSchema = z.strictObject({
  extraId: stableIdSchema,
  calculatorKey: stableIdSchema,
  parameters: ruleDataObjectSchema,
  mode: z.enum(EXTRA_SCORING_MODES),
  value: scoreValueSchema,
  capPlacement: z.enum(EXTRA_CAP_PLACEMENTS),
}) satisfies z.ZodType<ExtraScoringDefinition>;

export const scoringDefinitionSchema = z
  .strictObject({
    strategyKey: stableIdSchema,
    unit: z.string().trim().min(1).max(64),
    parameters: ruleDataObjectSchema,
    cap: capDefinitionSchema.optional(),
    extras: z.array(extraScoringDefinitionSchema).max(MAX_EXTRA_SCORING_DEFINITIONS).optional(),
  })
  .superRefine((scoring, context) => {
    const seen = new Set<string>();
    scoring.extras?.forEach((extra, index) => {
      if (seen.has(extra.extraId)) {
        context.addIssue({
          code: 'custom',
          message: 'extra scoring IDs must be unique',
          path: ['extras', index, 'extraId'],
        });
      }
      seen.add(extra.extraId);
    });
  })
  .transform((scoring): ScoringDefinition => ({
    strategyKey: scoring.strategyKey,
    unit: scoring.unit,
    parameters: scoring.parameters,
    ...(scoring.cap === undefined ? {} : { cap: scoring.cap }),
    ...(scoring.extras === undefined ? {} : { extras: scoring.extras }),
  })) satisfies z.ZodType<ScoringDefinition>;

export function parseScoringDefinition(input: unknown): ScoringDefinition {
  return scoringDefinitionSchema.parse(input);
}
