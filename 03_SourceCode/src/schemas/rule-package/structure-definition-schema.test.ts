import { describe, expect, it } from 'vitest';

import {
  createCapabilityRegistry,
  evaluateRuleCalculationReadiness,
} from '../../domain/rules/capability-registry';
import type { RuleManifest } from '../../domain/rules/rule-manifest';
import {
  parseStructureDefinitions,
  structureDefinitionsSchema,
} from './structure-definition-schema';

const structures = [
  {
    structureKey: 'standard-meld-pair',
    capabilityKey: 'structure.standard',
    enabled: true,
    supportStatus: 'SUPPORTED',
  },
  {
    structureKey: 'seven-pairs',
    capabilityKey: 'structure.sevenPairs',
    enabled: true,
    supportStatus: 'SUPPORTED',
    parameters: {
      requiredPairCount: 7,
      quadHandling: 'TWO_PAIRS',
    },
  },
  {
    structureKey: 'thirteen-orphans',
    capabilityKey: 'structure.thirteenOrphans',
    enabled: true,
    supportStatus: 'SUPPORTED',
    parameters: {
      requiredTiles: [
        'm1',
        'm9',
        'p1',
        'p9',
        's1',
        's9',
        'east',
        'south',
        'west',
        'north',
        'red',
        'green',
        'white',
      ],
      duplicateTileCount: 2,
    },
  },
  {
    structureKey: 'seven-star-unrelated',
    enabled: false,
    supportStatus: 'NOT_SUPPORTED_IN_V0_1',
    reasonCode: 'STRUCTURE_NOT_IMPLEMENTED',
  },
  {
    structureKey: 'all-unrelated',
    enabled: false,
    supportStatus: 'NOT_SUPPORTED_IN_V0_1',
    reasonCode: 'STRUCTURE_NOT_IMPLEMENTED',
  },
  {
    structureKey: 'knitted-straight',
    enabled: false,
    supportStatus: 'NOT_SUPPORTED_IN_V0_1',
    reasonCode: 'STRUCTURE_NOT_IMPLEMENTED',
  },
] as const;

function manifest(requiredCapabilities: readonly string[]) {
  return {
    status: 'test',
    engineCompatibility: { minEngineVersion: '0.0.0', requiredCapabilities },
  } satisfies Pick<RuleManifest, 'status' | 'engineCompatibility'>;
}

describe('StructureDefinition schema and capability boundary', () => {
  it('expresses the three enabled structures and three explicitly unsupported structures', () => {
    const parsed = parseStructureDefinitions(structures);

    expect(parsed.filter(({ enabled }) => enabled).map(({ structureKey }) => structureKey)).toEqual(
      ['standard-meld-pair', 'seven-pairs', 'thirteen-orphans'],
    );
    expect(
      parsed.filter(({ supportStatus }) => supportStatus === 'NOT_SUPPORTED_IN_V0_1'),
    ).toHaveLength(3);
  });

  it('allows enabled structures only through registered and manifest-declared capabilities', () => {
    const registry = createCapabilityRegistry([
      { capabilityKey: 'structure.standard', kind: 'structure' },
      { capabilityKey: 'structure.sevenPairs', kind: 'structure' },
      { capabilityKey: 'structure.thirteenOrphans', kind: 'structure' },
    ]);
    const requiredCapabilities = [
      'structure.standard',
      'structure.sevenPairs',
      'structure.thirteenOrphans',
    ];

    expect(
      evaluateRuleCalculationReadiness(
        registry,
        manifest(requiredCapabilities),
        [],
        parseStructureDefinitions(structures),
      ),
    ).toEqual({ canCalculate: true, blocks: [] });
  });

  it('blocks unknown, wrong-kind, and undeclared enabled structure capabilities', () => {
    const registry = createCapabilityRegistry([
      { capabilityKey: 'structure.standard', kind: 'recognizer' },
    ]);
    const parsed = parseStructureDefinitions([structures[0], structures[1]]);
    const readiness = evaluateRuleCalculationReadiness(registry, manifest([]), [], parsed);

    expect(readiness.canCalculate).toBe(false);
    expect(readiness.blocks.map(({ reasonCode }) => reasonCode)).toEqual([
      'CAPABILITY_KIND_MISMATCH',
      'STRUCTURE_CAPABILITY_NOT_DECLARED',
      'UNKNOWN_CAPABILITY',
    ]);
  });

  it('keeps unsupported semantics distinct from disabled supported capabilities', () => {
    expect(
      structureDefinitionsSchema.safeParse([
        {
          ...structures[3],
          enabled: true,
        },
      ]).success,
    ).toBe(false);
    expect(
      structureDefinitionsSchema.safeParse([
        {
          ...structures[3],
          capabilityKey: 'structure.sevenStarUnrelated',
        },
      ]).success,
    ).toBe(false);
    expect(structureDefinitionsSchema.safeParse([structures[0], structures[0]]).success).toBe(
      false,
    );
  });

  it('requires data-only parameters for special structure capabilities', () => {
    expect(
      structureDefinitionsSchema.safeParse([
        {
          structureKey: 'seven-pairs',
          capabilityKey: 'structure.sevenPairs',
          enabled: true,
          supportStatus: 'SUPPORTED',
        },
      ]).success,
    ).toBe(false);
    expect(
      structureDefinitionsSchema.safeParse([
        {
          ...structures[2],
          parameters: {
            ...structures[2].parameters,
            requiredTiles: ['m1', 'm1'],
          },
        },
      ]).success,
    ).toBe(false);
    expect(
      structureDefinitionsSchema.safeParse([
        {
          ...structures[2],
          parameters: {
            ...structures[2].parameters,
            duplicateTileCount: 1,
          },
        },
      ]).success,
    ).toBe(false);
  });
});
