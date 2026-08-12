import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { contextDefinitionsSchema } from './context-definition-schema';
import { handModelDefinitionSchema } from './hand-model-schema';
import { legalityDefinitionSchema } from './legality-definition-schema';
import { patternDefinitionsSchema } from './pattern-definition-schema';
import { patternRelationDefinitionsSchema } from './pattern-relation-schema';
import { ruleManifestSchema } from './rule-manifest-schema';
import { createRulePackageSchema } from './rule-package-schema';
import { ruleSourceDefinitionsSchema } from './rule-source-schema';
import { scoringDefinitionSchema } from './scoring-definition-schema';
import { structureDefinitionsSchema } from './structure-definition-schema';
import { temporaryAdjustmentDefinitionsSchema } from './temporary-adjustment-definition-schema';
import { tileSetDefinitionSchema } from './tile-set-schema';

const identifierSchema = z.string().trim().min(1);
const encyclopediaDefinitionSchema = z.strictObject({
  intro: z.array(z.string()),
  patternArticles: z.array(z.strictObject({ patternId: identifierSchema })),
  examples: z.array(z.strictObject({ exampleId: identifierSchema })),
  sourceArticles: z.array(z.strictObject({ sourceId: identifierSchema })),
  knownLimitations: z.array(z.string()),
});
const schema = createRulePackageSchema({
  manifest: ruleManifestSchema,
  tileSet: tileSetDefinitionSchema,
  handModel: handModelDefinitionSchema,
  structures: structureDefinitionsSchema,
  contexts: contextDefinitionsSchema,
  patterns: patternDefinitionsSchema,
  relations: patternRelationDefinitionsSchema,
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
      requiredCapabilities: ['structure.fixture', 'recognizer.fixture', 'recognizer.covered'],
    },
    releasedAt: '2026-08-11T00:00:00.000Z',
    contentHash: '0'.repeat(64),
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
    openKongPolicy: { distinction: 'undifferentiated', allowedKinds: [] },
    maxDeclaredMelds: 1,
    flowerPolicy: 'none',
  },
  structures: [
    {
      structureKey: 'standard-meld-pair',
      capabilityKey: 'structure.fixture',
      enabled: true,
      supportStatus: 'SUPPORTED',
    },
  ],
  contexts: [],
  patterns: [
    {
      patternId: 'fixture-pattern',
      name: 'Fixture Pattern',
      recognizerKey: 'recognizer.fixture',
      value: 1,
      unit: 'point',
      enabled: true,
      sourceRefs: ['fixture-source'],
    },
    {
      patternId: 'fixture-covered-pattern',
      name: 'Fixture Covered Pattern',
      recognizerKey: 'recognizer.covered',
      value: 1,
      unit: 'point',
      enabled: true,
      sourceRefs: ['fixture-source'],
    },
  ],
  relations: [{ type: 'covers', winner: 'fixture-pattern', covered: 'fixture-covered-pattern' }],
  scoring: {
    strategyKey: 'scoring.fixture',
    unit: 'point',
    parameters: {},
    cap: { enabled: false, value: null },
    extras: [],
  },
  legality: { minimumFan: 0, onMissingRequiredContext: 'incomplete-context' },
  temporaryAdjustments: [
    {
      adjustmentId: 'minimum-fan',
      target: { module: 'legality', field: 'minimumFan' },
      valueConstraint: { valueType: 'number', minimum: 0 },
    },
  ],
  encyclopedia: {
    intro: ['fixture'],
    patternArticles: [{ patternId: 'fixture-pattern' }],
    examples: [{ exampleId: 'fixture-example' }],
    sourceArticles: [{ sourceId: 'fixture-source' }],
    knownLimitations: [],
  },
  sources: [
    {
      sourceId: 'fixture-source',
      title: 'Fixture Source',
      sourceType: 'corroborating',
    },
  ],
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
