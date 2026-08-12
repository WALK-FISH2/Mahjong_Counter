import { z } from 'zod';

import { OPEN_KONG_KINDS } from '../../domain/mahjong/meld';
import {
  FLOWER_POLICIES,
  OPEN_KONG_DISTINCTIONS,
  RULE_MELD_TYPES,
  type HandModelDefinition,
} from '../../domain/rules/hand-model';

const safeNonNegativeIntegerSchema = z.number().int().nonnegative().safe();
const openKongPolicySchema = z.strictObject({
  distinction: z.enum(OPEN_KONG_DISTINCTIONS),
  allowedKinds: z
    .array(z.enum(OPEN_KONG_KINDS))
    .max(OPEN_KONG_KINDS.length)
    .superRefine((openKinds, context) => {
      const seen = new Set<string>();

      openKinds.forEach((openKind, index) => {
        if (seen.has(openKind)) {
          context.addIssue({
            code: 'custom',
            message: 'openKongPolicy.allowedKinds must be unique',
            path: [index],
          });
        }
        seen.add(openKind);
      });
    }),
});

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
    openKongPolicy: openKongPolicySchema,
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

    const allowsOpenKong = handModel.allowedMeldTypes.includes('open-kong');
    if (allowsOpenKong && handModel.openKongPolicy.allowedKinds.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'openKongPolicy.allowedKinds must not be empty when open-kong is allowed',
        path: ['openKongPolicy', 'allowedKinds'],
      });
    }

    if (!allowsOpenKong && handModel.openKongPolicy.allowedKinds.length > 0) {
      context.addIssue({
        code: 'custom',
        message: 'openKongPolicy.allowedKinds must be empty when open-kong is not allowed',
        path: ['openKongPolicy', 'allowedKinds'],
      });
    }
  }) satisfies z.ZodType<HandModelDefinition>;

export function parseHandModelDefinition(input: unknown): HandModelDefinition {
  return handModelDefinitionSchema.parse(input);
}
