import { z } from 'zod';

import { RULE_SOURCE_TYPES, type RuleSourceDefinition } from '../../domain/rules/rule-source';

const MAX_RULE_SOURCES = 512;
const stableIdSchema = z.string().trim().min(1).max(128);
const optionalTextSchema = z.string().trim().min(1).max(2048).optional();
const sourceUrlSchema = z
  .url()
  .max(2048)
  .refine(
    (url) => url.startsWith('https://') || url.startsWith('http://'),
    'Rule source URLs must use HTTP or HTTPS',
  );

export const ruleSourceDefinitionSchema = z
  .strictObject({
    sourceId: stableIdSchema,
    title: z.string().trim().min(1).max(512),
    publisher: optionalTextSchema,
    date: z.string().trim().min(1).max(64).optional(),
    url: sourceUrlSchema.optional(),
    sourceType: z.enum(RULE_SOURCE_TYPES),
    note: optionalTextSchema,
  })
  .transform((source): RuleSourceDefinition => ({
    sourceId: source.sourceId,
    title: source.title,
    sourceType: source.sourceType,
    ...(source.publisher === undefined ? {} : { publisher: source.publisher }),
    ...(source.date === undefined ? {} : { date: source.date }),
    ...(source.url === undefined ? {} : { url: source.url }),
    ...(source.note === undefined ? {} : { note: source.note }),
  })) satisfies z.ZodType<RuleSourceDefinition>;

export const ruleSourceDefinitionsSchema = z
  .array(ruleSourceDefinitionSchema)
  .max(MAX_RULE_SOURCES)
  .superRefine((sources, context) => {
    const seen = new Set<string>();
    sources.forEach((source, index) => {
      if (seen.has(source.sourceId)) {
        context.addIssue({
          code: 'custom',
          message: 'rule source IDs must be unique',
          path: [index, 'sourceId'],
        });
      }
      seen.add(source.sourceId);
    });
  });

export function parseRuleSourceDefinitions(input: unknown): readonly RuleSourceDefinition[] {
  return ruleSourceDefinitionsSchema.parse(input);
}
