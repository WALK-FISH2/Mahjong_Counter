import { z } from 'zod';

import {
  MISSING_REQUIRED_CONTEXT_OUTCOMES,
  type LegalityDefinition,
} from '../../domain/rules/legality-definition';

export const legalityDefinitionSchema = z.strictObject({
  minimumFan: z.number().finite().safe().nonnegative(),
  onMissingRequiredContext: z.enum(MISSING_REQUIRED_CONTEXT_OUTCOMES),
}) satisfies z.ZodType<LegalityDefinition>;

export function parseLegalityDefinition(input: unknown): LegalityDefinition {
  return legalityDefinitionSchema.parse(input);
}
