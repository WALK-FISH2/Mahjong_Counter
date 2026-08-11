import { z } from 'zod';

import {
  FLOWER_POLICIES,
  RULE_MELD_TYPES,
  type HandModelDefinition,
} from '../../domain/rules/hand-model';

const safeNonNegativeIntegerSchema = z.number().int().nonnegative().safe();

export const handModelDefinitionSchema = z
  .strictObject({
    targetStructuralTileCount: z.number().int().positive().safe(),
    readyStructuralTileCount: safeNonNegativeIntegerSchema,
    requiredMeldCount: safeNonNegativeIntegerSchema,
    allowedMeldTypes: z
      .array(z.enum(RULE_MELD_TYPES))
      .max(RULE_MELD_TYPES.length)
      .superRefine((meldTypes, context) => {
        const seen = new Set<string>();

        meldTypes.forEach((meldType, index) => {
          if (seen.has(meldType)) {
            context.addIssue({
              code: 'custom',
              message: 'allowedMeldTypes must be unique',
              path: [index],
            });
          }
          seen.add(meldType);
        });
      }),
    maxDeclaredMelds: safeNonNegativeIntegerSchema,
    flowerPolicy: z.enum(FLOWER_POLICIES),
  })
  .superRefine((handModel, context) => {
    if (handModel.readyStructuralTileCount >= handModel.targetStructuralTileCount) {
      context.addIssue({
        code: 'custom',
        message: 'readyStructuralTileCount must be lower than targetStructuralTileCount',
        path: ['readyStructuralTileCount'],
      });
    }
  }) satisfies z.ZodType<HandModelDefinition>;

export function parseHandModelDefinition(input: unknown): HandModelDefinition {
  return handModelDefinitionSchema.parse(input);
}
