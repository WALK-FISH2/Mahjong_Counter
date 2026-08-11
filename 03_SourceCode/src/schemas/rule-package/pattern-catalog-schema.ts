import { z } from 'zod';

import type { PatternDefinition } from '../../domain/rules/pattern-definition';
import type { RuleSourceDefinition } from '../../domain/rules/rule-source';
import { patternDefinitionsSchema } from './pattern-definition-schema';
import { ruleSourceDefinitionsSchema } from './rule-source-schema';

export type PatternCatalogWithSources = Readonly<{
  patterns: readonly PatternDefinition[];
  sources: readonly RuleSourceDefinition[];
}>;

export const patternCatalogWithSourcesSchema = z
  .strictObject({
    patterns: patternDefinitionsSchema,
    sources: ruleSourceDefinitionsSchema,
  })
  .superRefine((catalog, context) => {
    const sourceIds = new Set(catalog.sources.map((source) => source.sourceId));

    catalog.patterns.forEach((pattern, patternIndex) => {
      pattern.sourceRefs.forEach((sourceRef, sourceRefIndex) => {
        if (!sourceIds.has(sourceRef)) {
          context.addIssue({
            code: 'custom',
            message: 'pattern source references must resolve to a declared rule source',
            path: ['patterns', patternIndex, 'sourceRefs', sourceRefIndex],
          });
        }
      });
    });
  }) satisfies z.ZodType<PatternCatalogWithSources>;

export function parsePatternCatalogWithSources(input: unknown): PatternCatalogWithSources {
  return patternCatalogWithSourcesSchema.parse(input);
}
