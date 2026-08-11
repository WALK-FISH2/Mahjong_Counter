import { z } from 'zod';

import type {
  EncyclopediaContentBlock,
  EncyclopediaDefinition,
  EncyclopediaExampleDefinition,
  PatternArticleDefinition,
  SourceArticleDefinition,
} from '../../domain/rules/encyclopedia-definition';

const MAX_CONTENT_BLOCKS = 2048;
const MAX_ARTICLES = 2048;
const MAX_EXAMPLES = 2048;
const stableIdSchema = z.string().trim().min(1).max(128);
const versionSchema = z.string().trim().min(1).max(64);

const contentBlockSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('paragraph'),
    text: z.string().min(1).max(16_384),
  }),
  z.strictObject({
    type: z.literal('list'),
    items: z.array(z.string().min(1).max(4096)).min(1).max(256),
  }),
]) satisfies z.ZodType<EncyclopediaContentBlock>;

const contentBlocksSchema = z.array(contentBlockSchema).max(MAX_CONTENT_BLOCKS);

const patternArticleSchema = z.strictObject({
  patternId: stableIdSchema,
  blocks: contentBlocksSchema,
}) satisfies z.ZodType<PatternArticleDefinition>;

const encyclopediaExampleSchema = z.strictObject({
  exampleId: stableIdSchema,
  title: z.string().trim().min(1).max(256),
  ruleCaseId: stableIdSchema,
}) satisfies z.ZodType<EncyclopediaExampleDefinition>;

const sourceArticleSchema = z.strictObject({
  sourceId: stableIdSchema,
  blocks: contentBlocksSchema,
}) satisfies z.ZodType<SourceArticleDefinition>;

function addUniqueIdIssues<T>(
  values: readonly T[],
  getId: (value: T) => string,
  context: z.RefinementCtx,
  label: string,
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    const id = getId(value);
    if (seen.has(id)) {
      context.addIssue({ code: 'custom', message: `${label} IDs must be unique`, path: [index] });
    }
    seen.add(id);
  });
}

export const encyclopediaDefinitionSchema = z
  .strictObject({
    ruleId: stableIdSchema,
    ruleVersion: versionSchema,
    intro: contentBlocksSchema,
    patternArticles: z.array(patternArticleSchema).max(MAX_ARTICLES),
    examples: z.array(encyclopediaExampleSchema).max(MAX_EXAMPLES),
    sourceArticles: z.array(sourceArticleSchema).max(MAX_ARTICLES),
    knownLimitations: contentBlocksSchema,
  })
  .superRefine((encyclopedia, context) => {
    addUniqueIdIssues(
      encyclopedia.patternArticles,
      ({ patternId }) => patternId,
      context,
      'pattern article',
    );
    addUniqueIdIssues(
      encyclopedia.examples,
      ({ exampleId }) => exampleId,
      context,
      'encyclopedia example',
    );
    addUniqueIdIssues(
      encyclopedia.sourceArticles,
      ({ sourceId }) => sourceId,
      context,
      'source article',
    );
  }) satisfies z.ZodType<EncyclopediaDefinition>;

export function parseEncyclopediaDefinition(input: unknown): EncyclopediaDefinition {
  return encyclopediaDefinitionSchema.parse(input);
}
