import { z } from 'zod';
import {
  DEFAULT_CALCULATOR_PREFERENCES,
  type CalculatorPreferences,
} from '../../application/preferences';
import { ruleRefSchema } from './calculator-state-schema';
import { assertPersistenceInput } from './saved-example-schema';

const legacy = z.strictObject({
  lastRuleRef: ruleRefSchema.nullable(),
  recentRuleRefs: z.array(ruleRefSchema).max(100),
  ruleNoticeSeen: z.boolean(),
  inputGuideSeen: z.boolean(),
  waitSortMode: z.enum(['highest-score', 'wait-count']),
  testingRuleConfirmations: z.record(
    z.string().max(256),
    z.strictObject({
      ruleRef: ruleRefSchema,
      resultImpactVersion: z.string().min(1).max(256),
    }),
  ),
});
export const preferencesSchema = legacy.extend({
  theme: z.enum(['system', 'light', 'dark']),
  motion: z.enum(['system', 'reduced', 'full']),
  defaultCopyFormat: z.enum(['concise', 'detailed']),
  autoUpdateCheckEnabled: z.boolean(),
  lastUpdateCheckAt: z.iso.datetime().nullable(),
  pwaPromptState: z.enum(['unseen', 'dismissed', 'accepted']),
}) satisfies z.ZodType<CalculatorPreferences>;

export function parsePreferences(input: unknown): CalculatorPreferences {
  assertPersistenceInput(input);
  const envelope = z
    .discriminatedUnion('version', [
      z.strictObject({ version: z.literal(1), preferences: legacy }),
      z.strictObject({ version: z.literal(2), preferences: preferencesSchema }),
    ])
    .parse(input);
  return preferencesSchema.parse({ ...DEFAULT_CALCULATOR_PREFERENCES, ...envelope.preferences });
}
