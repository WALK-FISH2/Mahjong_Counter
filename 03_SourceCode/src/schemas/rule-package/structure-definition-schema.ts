import { z } from 'zod';

import {
  SEVEN_PAIRS_QUAD_HANDLINGS,
  STRUCTURE_KEYS,
  type StructureDefinition,
} from '../../domain/rules/structure-definition';
import { TILE_CODES } from '../../domain/mahjong/tile';

const MAX_STRUCTURE_DEFINITIONS = STRUCTURE_KEYS.length;
const capabilityKeySchema = z.string().trim().min(1).max(128);
const structureKeySchema = z.enum(STRUCTURE_KEYS);

const supportedStructureDefinitionBase = {
  capabilityKey: capabilityKeySchema,
  enabled: z.boolean(),
  supportStatus: z.literal('SUPPORTED'),
} as const;

const standardStructureDefinitionSchema = z.strictObject({
  ...supportedStructureDefinitionBase,
  structureKey: z.literal('standard-meld-pair'),
});

const sevenPairsStructureDefinitionSchema = z.strictObject({
  ...supportedStructureDefinitionBase,
  structureKey: z.literal('seven-pairs'),
  parameters: z.strictObject({
    requiredPairCount: z.number().int().positive().safe(),
    quadHandling: z.enum(SEVEN_PAIRS_QUAD_HANDLINGS),
  }),
});

const thirteenOrphansStructureDefinitionSchema = z.strictObject({
  ...supportedStructureDefinitionBase,
  structureKey: z.literal('thirteen-orphans'),
  parameters: z.strictObject({
    requiredTiles: z
      .array(z.enum(TILE_CODES))
      .min(1)
      .max(TILE_CODES.length)
      .superRefine((tiles, context) => {
        const seen = new Set<string>();

        tiles.forEach((tile, index) => {
          if (seen.has(tile)) {
            context.addIssue({
              code: 'custom',
              message: 'thirteen-orphans requiredTiles must be unique',
              path: [index],
            });
          }
          seen.add(tile);
        });
      }),
    duplicateTileCount: z.number().int().min(2).safe(),
  }),
});

const supportedStructureDefinitionSchema = z.discriminatedUnion('structureKey', [
  standardStructureDefinitionSchema,
  sevenPairsStructureDefinitionSchema,
  thirteenOrphansStructureDefinitionSchema,
]);

const unsupportedStructureDefinitionSchema = z.strictObject({
  structureKey: structureKeySchema,
  enabled: z.literal(false),
  supportStatus: z.literal('NOT_SUPPORTED_IN_V0_1'),
  reasonCode: z.literal('STRUCTURE_NOT_IMPLEMENTED'),
});

export const structureDefinitionSchema = z.discriminatedUnion('supportStatus', [
  supportedStructureDefinitionSchema,
  unsupportedStructureDefinitionSchema,
]) satisfies z.ZodType<StructureDefinition>;

export const structureDefinitionsSchema = z
  .array(structureDefinitionSchema)
  .max(MAX_STRUCTURE_DEFINITIONS)
  .superRefine((structures, context) => {
    const seen = new Set<string>();

    structures.forEach((structure, index) => {
      if (seen.has(structure.structureKey)) {
        context.addIssue({
          code: 'custom',
          message: 'structure keys must be unique',
          path: [index, 'structureKey'],
        });
      }
      seen.add(structure.structureKey);
    });
  });

export function parseStructureDefinitions(input: unknown): readonly StructureDefinition[] {
  return structureDefinitionsSchema.parse(input);
}
