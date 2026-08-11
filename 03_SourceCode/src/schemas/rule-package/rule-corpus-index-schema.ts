import { z } from 'zod';

import {
  RULE_CASE_KINDS,
  type RuleCaseIndexEntry,
  type RuleCorpusIndex,
} from '../../domain/rules/rule-corpus-index';

const MAX_RULE_CASES = 16_384;
const stableIdSchema = z.string().trim().min(1).max(128);

const ruleCaseIndexEntrySchema = z
  .strictObject({
    caseId: stableIdSchema,
    patternId: stableIdSchema.optional(),
    kind: z.enum(RULE_CASE_KINDS),
  })
  .transform((entry): RuleCaseIndexEntry => ({
    caseId: entry.caseId,
    kind: entry.kind,
    ...(entry.patternId === undefined ? {} : { patternId: entry.patternId }),
  }));

export const ruleCorpusIndexSchema = z
  .strictObject({
    ruleId: stableIdSchema,
    ruleVersion: z.string().trim().min(1).max(64),
    cases: z.array(ruleCaseIndexEntrySchema).max(MAX_RULE_CASES),
  })
  .superRefine((corpus, context) => {
    const seen = new Set<string>();
    corpus.cases.forEach((entry, index) => {
      if (seen.has(entry.caseId)) {
        context.addIssue({
          code: 'custom',
          message: 'rule case IDs must be unique',
          path: ['cases', index, 'caseId'],
        });
      }
      seen.add(entry.caseId);
    });
  }) satisfies z.ZodType<RuleCorpusIndex>;

export function parseRuleCorpusIndex(input: unknown): RuleCorpusIndex {
  return ruleCorpusIndexSchema.parse(input);
}
