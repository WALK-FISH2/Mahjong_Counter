import { z } from 'zod';

import {
  PATTERN_CONFIDENCE_LEVELS,
  type PatternDefinition,
} from '../../domain/rules/pattern-definition';
import { ruleDataObjectSchema } from './rule-data-schema';

const MAX_PATTERN_DEFINITIONS = 2048;
const stableIdSchema = z.string().trim().min(1).max(128);

const uniqueStringArraySchema = z
  .array(z.string().trim().min(1).max(256))
  .superRefine((values, context) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      if (seen.has(value)) {
        context.addIssue({ code: 'custom', message: 'values must be unique', path: [index] });
      }
      seen.add(value);
    });
  });

export const patternDefinitionSchema = z
  .strictObject({
    patternId: stableIdSchema,
    name: z.string().trim().min(1).max(256),
    aliases: uniqueStringArraySchema.max(64).optional(),
    recognizerKey: stableIdSchema,
    recognizerParams: ruleDataObjectSchema.optional(),
    value: z.union([z.number().finite().safe(), z.string().trim().min(1).max(128)]),
    unit: z.string().trim().min(1).max(64),
    enabled: z.boolean(),
    sourceRefs: uniqueStringArraySchema.min(1).max(32),
    confidence: z.enum(PATTERN_CONFIDENCE_LEVELS).optional(),
  })
  .transform((pattern): PatternDefinition => ({
    patternId: pattern.patternId,
    name: pattern.name,
    recognizerKey: pattern.recognizerKey,
    value: pattern.value,
    unit: pattern.unit,
    enabled: pattern.enabled,
    sourceRefs: pattern.sourceRefs,
    ...(pattern.aliases === undefined ? {} : { aliases: pattern.aliases }),
    ...(pattern.recognizerParams === undefined
      ? {}
      : { recognizerParams: pattern.recognizerParams }),
    ...(pattern.confidence === undefined ? {} : { confidence: pattern.confidence }),
  })) satisfies z.ZodType<PatternDefinition>;

export const patternDefinitionsSchema = z
  .array(patternDefinitionSchema)
  .max(MAX_PATTERN_DEFINITIONS)
  .superRefine((patterns, context) => {
    const seen = new Set<string>();
    patterns.forEach((pattern, index) => {
      if (seen.has(pattern.patternId)) {
        context.addIssue({
          code: 'custom',
          message: 'pattern IDs must be unique',
          path: [index, 'patternId'],
        });
      }
      seen.add(pattern.patternId);
    });
  });

export function parsePatternDefinitions(input: unknown): readonly PatternDefinition[] {
  return patternDefinitionsSchema.parse(input);
}
