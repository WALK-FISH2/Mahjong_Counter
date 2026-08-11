import { z } from 'zod';

import { STRUCTURE_KEYS, type StructureDefinition } from '../../domain/rules/structure-definition';

const MAX_STRUCTURE_DEFINITIONS = STRUCTURE_KEYS.length;
const capabilityKeySchema = z.string().trim().min(1).max(128);
const structureKeySchema = z.enum(STRUCTURE_KEYS);

const supportedStructureDefinitionSchema = z.strictObject({
  structureKey: structureKeySchema,
  capabilityKey: capabilityKeySchema,
  enabled: z.boolean(),
  supportStatus: z.literal('SUPPORTED'),
});

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
