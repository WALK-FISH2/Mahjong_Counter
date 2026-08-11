import { z } from 'zod';

import {
  RULE_STATUSES,
  type EngineCompatibility,
  type RuleManifest,
} from '../../domain/rules/rule-manifest';
import { SHA256_CONTENT_HASH_PATTERN } from '../../domain/rules/content-integrity';

const identifierSchema = z.string().trim().min(1).max(128);
const versionSchema = z.string().trim().min(1).max(64);
const capabilitySchema = z.string().trim().min(1).max(128);

export const contentHashSchema = z
  .string()
  .regex(SHA256_CONTENT_HASH_PATTERN, 'contentHash must be a lowercase SHA-256 hex digest');

const engineCompatibilitySchema = z
  .strictObject({
    minEngineVersion: versionSchema,
    maxEngineVersion: versionSchema.optional(),
    requiredCapabilities: z
      .array(capabilitySchema)
      .max(256)
      .superRefine((capabilities, context) => {
        const seen = new Set<string>();

        capabilities.forEach((capability, index) => {
          if (seen.has(capability)) {
            context.addIssue({
              code: 'custom',
              message: 'requiredCapabilities must be unique',
              path: [index],
            });
          }
          seen.add(capability);
        });
      }),
  })
  .transform((compatibility): EngineCompatibility => ({
    minEngineVersion: compatibility.minEngineVersion,
    requiredCapabilities: compatibility.requiredCapabilities,
    ...(compatibility.maxEngineVersion === undefined
      ? {}
      : { maxEngineVersion: compatibility.maxEngineVersion }),
  }));

export const ruleManifestSchema = z
  .strictObject({
    ruleId: identifierSchema,
    ruleVersion: versionSchema,
    displayName: z.string().trim().min(1).max(256),
    familyId: identifierSchema,
    region: z.string().trim().min(1).max(128).optional(),
    status: z.enum(RULE_STATUSES),
    recommended: z.boolean().optional(),
    engineCompatibility: engineCompatibilitySchema,
    releasedAt: z.iso.datetime({ offset: true }),
    contentHash: contentHashSchema,
  })
  .transform((manifest): RuleManifest => ({
    ruleId: manifest.ruleId,
    ruleVersion: manifest.ruleVersion,
    displayName: manifest.displayName,
    familyId: manifest.familyId,
    status: manifest.status,
    engineCompatibility: manifest.engineCompatibility,
    releasedAt: manifest.releasedAt,
    contentHash: manifest.contentHash,
    ...(manifest.region === undefined ? {} : { region: manifest.region }),
    ...(manifest.recommended === undefined ? {} : { recommended: manifest.recommended }),
  })) satisfies z.ZodType<RuleManifest>;

export function parseRuleManifest(input: unknown): RuleManifest {
  return ruleManifestSchema.parse(input);
}
