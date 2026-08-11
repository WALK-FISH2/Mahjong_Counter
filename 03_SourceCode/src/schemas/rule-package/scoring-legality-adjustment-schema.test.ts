import { describe, expect, it } from 'vitest';

import { legalityDefinitionSchema, parseLegalityDefinition } from './legality-definition-schema';
import { parseScoringDefinition, scoringDefinitionSchema } from './scoring-definition-schema';
import {
  parseTemporaryAdjustmentDefinitions,
  parseTemporaryAdjustmentValues,
  temporaryAdjustmentDefinitionsSchema,
} from './temporary-adjustment-definition-schema';

const scoring = {
  strategyKey: 'scoring.additive',
  unit: 'fan',
  parameters: {},
  cap: { enabled: false, value: null },
  extras: [
    {
      extraId: 'selfDraw',
      calculatorKey: 'scoring.extra.context-match',
      parameters: { contextId: 'winMode', equals: 'self-draw' },
      mode: 'ADD',
      value: 1,
      capPlacement: 'before-cap',
    },
    {
      extraId: 'flowers',
      calculatorKey: 'scoring.extra.tile-group-count',
      parameters: { tileGroupId: 'flowers' },
      mode: 'ADD',
      value: 1,
      capPlacement: 'before-cap',
    },
  ],
} as const;

const legality = {
  minimumFan: 0,
  onMissingRequiredContext: 'incomplete-context',
} as const;

const temporaryAdjustments = [
  {
    adjustmentId: 'minimumFan',
    target: { module: 'legality', field: 'minimumFan' },
    valueConstraint: { valueType: 'number', minimum: 0 },
  },
  {
    adjustmentId: 'cap.enabled',
    target: { module: 'scoring-cap', field: 'enabled' },
    valueConstraint: { valueType: 'boolean' },
  },
  {
    adjustmentId: 'cap.value',
    target: { module: 'scoring-cap', field: 'value' },
    valueConstraint: { valueType: 'nullable-number', minimum: 0 },
  },
  {
    adjustmentId: 'selfDraw.mode',
    target: { module: 'scoring-extra', extraId: 'selfDraw', field: 'mode' },
    valueConstraint: { valueType: 'enum', values: ['ADD'] },
  },
  {
    adjustmentId: 'selfDraw.value',
    target: { module: 'scoring-extra', extraId: 'selfDraw', field: 'value' },
    valueConstraint: { valueType: 'number', minimum: 0 },
  },
  {
    adjustmentId: 'pattern.fixturePattern.enabled',
    target: { module: 'pattern', patternId: 'fixturePattern', field: 'enabled' },
    valueConstraint: { valueType: 'boolean' },
  },
  {
    adjustmentId: 'pattern.fixturePattern.value',
    target: { module: 'pattern', patternId: 'fixturePattern', field: 'value' },
    valueConstraint: { valueType: 'number', minimum: 0 },
  },
] as const;

describe('Scoring, Legality, and TemporaryAdjustment schemas', () => {
  it('expresses the common-simple Rule Spec fixture without executing a formula', () => {
    const parsedScoring = parseScoringDefinition(scoring);
    const parsedLegality = parseLegalityDefinition(legality);
    const parsedAdjustments = parseTemporaryAdjustmentDefinitions(temporaryAdjustments);

    expect(parsedScoring).toMatchObject({
      strategyKey: 'scoring.additive',
      unit: 'fan',
      cap: { enabled: false, value: null },
    });
    expect(parsedScoring.extras).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extraId: 'selfDraw',
          calculatorKey: 'scoring.extra.context-match',
          parameters: { contextId: 'winMode', equals: 'self-draw' },
          mode: 'ADD',
          value: 1,
        }),
        expect.objectContaining({
          extraId: 'flowers',
          calculatorKey: 'scoring.extra.tile-group-count',
          parameters: { tileGroupId: 'flowers' },
          mode: 'ADD',
          value: 1,
        }),
      ]),
    );
    expect(parsedLegality).toEqual(legality);
    expect(parsedAdjustments.map(({ adjustmentId }) => adjustmentId)).toEqual(
      temporaryAdjustments.map(({ adjustmentId }) => adjustmentId),
    );
  });

  it('rejects illegal scoring and legality numbers or inconsistent cap states', () => {
    expect(
      scoringDefinitionSchema.safeParse({ ...scoring, cap: { enabled: true, value: null } })
        .success,
    ).toBe(false);
    expect(
      scoringDefinitionSchema.safeParse({
        ...scoring,
        extras: [{ ...scoring.extras[0], value: Number.POSITIVE_INFINITY }],
      }).success,
    ).toBe(false);
    expect(legalityDefinitionSchema.safeParse({ ...legality, minimumFan: -1 }).success).toBe(false);
  });

  it('accepts only values declared by the active rule and enforces their constraints', () => {
    const definitions = parseTemporaryAdjustmentDefinitions(temporaryAdjustments);

    expect(
      parseTemporaryAdjustmentValues(definitions, {
        minimumFan: 8,
        'cap.enabled': true,
        'cap.value': 16,
        'selfDraw.mode': 'ADD',
        'pattern.fixturePattern.enabled': false,
      }),
    ).toEqual({
      minimumFan: 8,
      'cap.enabled': true,
      'cap.value': 16,
      'selfDraw.mode': 'ADD',
      'pattern.fixturePattern.enabled': false,
    });

    expect(() => parseTemporaryAdjustmentValues(definitions, { roomMultiplier: 2 })).toThrow();
    expect(() => parseTemporaryAdjustmentValues(definitions, { minimumFan: -1 })).toThrow();
    expect(() =>
      parseTemporaryAdjustmentValues(definitions, { 'selfDraw.mode': 'MULTIPLY' }),
    ).toThrow();
  });

  it('rejects mismatched value declarations, duplicate targets, and executable data', () => {
    expect(
      temporaryAdjustmentDefinitionsSchema.safeParse([
        {
          ...temporaryAdjustments[0],
          valueConstraint: { valueType: 'boolean' },
        },
      ]).success,
    ).toBe(false);
    expect(
      temporaryAdjustmentDefinitionsSchema.safeParse([
        temporaryAdjustments[0],
        { ...temporaryAdjustments[0], adjustmentId: 'anotherMinimum' },
      ]).success,
    ).toBe(false);
    expect(
      scoringDefinitionSchema.safeParse({
        ...scoring,
        parameters: { script: 'return eval(input)' },
      }).success,
    ).toBe(false);
  });
});
