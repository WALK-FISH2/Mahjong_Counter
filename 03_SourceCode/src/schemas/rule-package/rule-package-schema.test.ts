import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { contextDefinitionsSchema } from './context-definition-schema';
import { handModelDefinitionSchema } from './hand-model-schema';
import { ruleManifestSchema } from './rule-manifest-schema';
import { createRulePackageSchema } from './rule-package-schema';
import { tileSetDefinitionSchema } from './tile-set-schema';

const identifierSchema = z.string().trim().min(1);
const structureDefinitionsSchema = z.array(
  z.strictObject({
    structureKey: identifierSchema,
    capabilityKey: identifierSchema,
    enabled: z.boolean(),
  }),
);
const patternDefinitionsSchema = z.array(
  z.strictObject({
    patternId: identifierSchema,
    recognizerKey: identifierSchema,
    enabled: z.boolean(),
  }),
);
const relationDefinitionsSchema = z.array(
  z.strictObject({
    type: z.literal('covers'),
    winner: identifierSchema,
    covered: identifierSchema,
  }),
);
const scoringDefinitionSchema = z.strictObject({
  strategyKey: identifierSchema,
  unit: identifierSchema,
});
const legalityDefinitionSchema = z.strictObject({ minimumFan: z.number().nonnegative() });
const temporaryAdjustmentDefinitionsSchema = z.array(
  z.strictObject({ adjustmentId: identifierSchema, valueType: z.literal('number') }),
);
const encyclopediaDefinitionSchema = z.strictObject({
  intro: z.array(z.string()),
  patternArticles: z.array(z.strictObject({ patternId: identifierSchema })),
  examples: z.array(z.strictObject({ exampleId: identifierSchema })),
  sourceArticles: z.array(z.strictObject({ sourceId: identifierSchema })),
  knownLimitations: z.array(z.string()),
});
const ruleSourceDefinitionsSchema = z.array(
  z.strictObject({ sourceId: identifierSchema, title: z.string().trim().min(1) }),
);

const schema = createRulePackageSchema({
  manifest: ruleManifestSchema,
  tileSet: tileSetDefinitionSchema,
  handModel: handModelDefinitionSchema,
  structures: structureDefinitionsSchema,
  contexts: contextDefinitionsSchema,
  patterns: patternDefinitionsSchema,
  relations: relationDefinitionsSchema,
  scoring: scoringDefinitionSchema,
  legality: legalityDefinitionSchema,
  temporaryAdjustments: temporaryAdjustmentDefinitionsSchema,
  encyclopedia: encyclopediaDefinitionSchema,
  sources: ruleSourceDefinitionsSchema,
});

const validPackage = {
  schemaVersion: 1,
  manifest: {
    ruleId: 'fixture-rule',
    ruleVersion: '1.0.0',
    displayName: 'Fixture Rule',
    familyId: 'fixture-family',
    status: 'test',
    engineCompatibility: {
      minEngineVersion: '0.0.0',
      requiredCapabilities: ['structure.fixture'],
    },
    releasedAt: '2026-08-11T00:00:00.000Z',
    contentHash: 'fixture-content-hash',
  },
  tileSet: {
    enabledTiles: ['m1', 'm2', 'm3'],
    maxCopies: { m1: 4, m2: 4, m3: 4 },
    groups: [{ id: 'characters', labelKey: 'tiles.characters', tiles: ['m1', 'm2', 'm3'] }],
  },
  handModel: {
    targetStructuralTileCount: 5,
    readyStructuralTileCount: 4,
    requiredMeldCount: 1,
    allowedMeldTypes: ['chow'],
    maxDeclaredMelds: 1,
    flowerPolicy: 'none',
  },
  structures: [
    { structureKey: 'fixture-structure', capabilityKey: 'structure.fixture', enabled: true },
  ],
  contexts: [],
  patterns: [{ patternId: 'fixture-pattern', recognizerKey: 'recognizer.fixture', enabled: true }],
  relations: [{ type: 'covers', winner: 'fixture-pattern', covered: 'fixture-covered-pattern' }],
  scoring: { strategyKey: 'scoring.fixture', unit: 'point' },
  legality: { minimumFan: 0 },
  temporaryAdjustments: [{ adjustmentId: 'minimum-fan', valueType: 'number' }],
  encyclopedia: {
    intro: ['fixture'],
    patternArticles: [{ patternId: 'fixture-pattern' }],
    examples: [{ exampleId: 'fixture-example' }],
    sourceArticles: [{ sourceId: 'fixture-source' }],
    knownLimitations: [],
  },
  sources: [{ sourceId: 'fixture-source', title: 'Fixture Source' }],
} as const;

describe('RulePackage top-level schema composition', () => {
  it('validates an unknown input through every required child schema', () => {
    const externalInput: unknown = validPackage;
    const parsed = schema.parse(externalInput);

    expect(parsed).toEqual(validPackage);
    expectTypeOf(parsed.schemaVersion).toEqualTypeOf<number>();
    expectTypeOf(parsed.manifest.status).toEqualTypeOf<'development' | 'test' | 'full'>();
  });

  it('rejects missing top-level modules and unknown top-level fields', () => {
    expect(schema.safeParse({ ...validPackage, sources: undefined }).success).toBe(false);
    expect(schema.safeParse({ ...validPackage, executableScript: 'return 1' }).success).toBe(false);
  });

  it('delegates validation to future child schemas without accepting placeholders', () => {
    expect(schema.safeParse({ ...validPackage, scoring: {} }).success).toBe(false);
    expect(
      schema.safeParse({
        ...validPackage,
        scoring: { ...validPackage.scoring, script: 'score = eval(input)' },
      }).success,
    ).toBe(false);
  });
});
