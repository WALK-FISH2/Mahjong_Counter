import { describe, expect, it } from 'vitest';

import { contextDefinitionsSchema, parseContextDefinitions } from './context-definition-schema';

const windOptions = [
  { value: 'east', labelKey: 'winds.east' },
  { value: 'south', labelKey: 'winds.south' },
  { value: 'west', labelKey: 'winds.west' },
  { value: 'north', labelKey: 'winds.north' },
] as const;

const contexts = [
  {
    contextId: 'seatWind',
    labelKey: 'context.seatWind',
    valueType: 'single-select',
    required: true,
    displayGroup: 'primary',
    applicableWinModes: ['discard', 'self-draw'],
    options: windOptions,
  },
  {
    contextId: 'roundWind',
    labelKey: 'context.roundWind',
    valueType: 'single-select',
    required: true,
    displayGroup: 'primary',
    applicableWinModes: ['discard', 'self-draw'],
    options: windOptions,
  },
  {
    contextId: 'afterKongReplacement',
    labelKey: 'context.afterKongReplacement',
    valueType: 'boolean',
    required: false,
    displayGroup: 'more',
    applicableWinModes: ['self-draw'],
    displayWhen: { winModes: ['self-draw'] },
    mutuallyExclusiveWith: ['robbingAddedKong'],
  },
  {
    contextId: 'robbingAddedKong',
    labelKey: 'context.robbingAddedKong',
    valueType: 'boolean',
    required: false,
    displayGroup: 'more',
    applicableWinModes: ['discard'],
    displayWhen: {
      winModes: ['discard'],
      allOf: [{ contextId: 'seatWind', operator: 'not-equals', value: 'north' }],
    },
    mutuallyExclusiveWith: ['afterKongReplacement'],
  },
] as const;

describe('ContextDefinition schema', () => {
  it('expresses required seat/round winds and conditional kong contexts', () => {
    const parsed = parseContextDefinitions(contexts);

    expect(
      parsed.filter((definition) => definition.required).map(({ contextId }) => contextId),
    ).toEqual(['seatWind', 'roundWind']);
    expect(parsed.find(({ contextId }) => contextId === 'afterKongReplacement')).toMatchObject({
      applicableWinModes: ['self-draw'],
      displayWhen: { winModes: ['self-draw'] },
    });
  });

  it('requires explicit required/display metadata and valid select options', () => {
    const missingRequired = { ...contexts[0], required: undefined };
    const missingOptions = { ...contexts[0], options: undefined };

    expect(contextDefinitionsSchema.safeParse([missingRequired]).success).toBe(false);
    expect(contextDefinitionsSchema.safeParse([missingOptions]).success).toBe(false);
  });

  it('rejects unknown/self mutex references and invalid display predicates', () => {
    expect(
      contextDefinitionsSchema.safeParse([
        { ...contexts[0], mutuallyExclusiveWith: ['missingContext'] },
      ]).success,
    ).toBe(false);
    expect(
      contextDefinitionsSchema.safeParse([{ ...contexts[0], mutuallyExclusiveWith: ['seatWind'] }])
        .success,
    ).toBe(false);
    expect(
      contextDefinitionsSchema.safeParse([
        contexts[0],
        {
          ...contexts[2],
          displayWhen: {
            winModes: ['self-draw'],
            allOf: [{ contextId: 'seatWind', operator: 'equals', value: true }],
          },
          mutuallyExclusiveWith: undefined,
        },
      ]).success,
    ).toBe(false);
  });
});
