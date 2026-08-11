import { describe, expect, it } from 'vitest';

import { handModelDefinitionSchema, parseHandModelDefinition } from './hand-model-schema';

describe('HandModelDefinition schema', () => {
  it('expresses the ordinary 13/14 model as rule data', () => {
    const parsed = parseHandModelDefinition({
      targetStructuralTileCount: 14,
      readyStructuralTileCount: 13,
      requiredMeldCount: 4,
      allowedMeldTypes: ['chow', 'pung', 'open-kong', 'concealed-kong'],
      maxDeclaredMelds: 4,
      flowerPolicy: 'separate',
    });

    expect(parsed).toEqual({
      targetStructuralTileCount: 14,
      readyStructuralTileCount: 13,
      requiredMeldCount: 4,
      allowedMeldTypes: ['chow', 'pung', 'open-kong', 'concealed-kong'],
      maxDeclaredMelds: 4,
      flowerPolicy: 'separate',
    });
  });

  it('accepts a different structural target without changing Engine or UI code', () => {
    expect(
      parseHandModelDefinition({
        targetStructuralTileCount: 16,
        readyStructuralTileCount: 15,
        requiredMeldCount: 5,
        allowedMeldTypes: ['pung'],
        maxDeclaredMelds: 5,
        flowerPolicy: 'none',
      }).targetStructuralTileCount,
    ).toBe(16);
  });

  it('rejects impossible counts and duplicate meld declarations', () => {
    expect(
      handModelDefinitionSchema.safeParse({
        targetStructuralTileCount: 14,
        readyStructuralTileCount: 14,
        requiredMeldCount: 4,
        allowedMeldTypes: ['chow'],
        maxDeclaredMelds: 4,
        flowerPolicy: 'separate',
      }).success,
    ).toBe(false);
    expect(
      handModelDefinitionSchema.safeParse({
        targetStructuralTileCount: 14,
        readyStructuralTileCount: 13,
        requiredMeldCount: 4,
        allowedMeldTypes: ['pung', 'pung'],
        maxDeclaredMelds: 4,
        flowerPolicy: 'none',
      }).success,
    ).toBe(false);
  });
});
