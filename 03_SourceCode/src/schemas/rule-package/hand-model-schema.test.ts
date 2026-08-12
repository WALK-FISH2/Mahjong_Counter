import { describe, expect, it } from 'vitest';

import { handModelDefinitionSchema, parseHandModelDefinition } from './hand-model-schema';

describe('HandModelDefinition schema', () => {
  it('expresses the ordinary 13/14 model as rule data', () => {
    const parsed = parseHandModelDefinition({
      targetStructuralTileCount: 14,
      readyStructuralTileCount: 13,
      requiredMeldCount: 4,
      allowedMeldTypes: ['chow', 'pung', 'open-kong', 'concealed-kong'],
      openKongPolicy: {
        distinction: 'undifferentiated',
        allowedKinds: ['direct', 'added'],
      },
      maxDeclaredMelds: 4,
      flowerPolicy: 'separate',
    });

    expect(parsed).toEqual({
      targetStructuralTileCount: 14,
      readyStructuralTileCount: 13,
      requiredMeldCount: 4,
      allowedMeldTypes: ['chow', 'pung', 'open-kong', 'concealed-kong'],
      openKongPolicy: {
        distinction: 'undifferentiated',
        allowedKinds: ['direct', 'added'],
      },
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
        openKongPolicy: { distinction: 'undifferentiated', allowedKinds: [] },
        maxDeclaredMelds: 5,
        flowerPolicy: 'none',
      }).targetStructuralTileCount,
    ).toBe(16);
  });

  it('expresses explicit direct/added distinction without executable rule data', () => {
    expect(
      parseHandModelDefinition({
        targetStructuralTileCount: 14,
        readyStructuralTileCount: 13,
        requiredMeldCount: 4,
        allowedMeldTypes: ['open-kong'],
        openKongPolicy: { distinction: 'distinguished', allowedKinds: ['added'] },
        maxDeclaredMelds: 4,
        flowerPolicy: 'none',
      }).openKongPolicy,
    ).toEqual({ distinction: 'distinguished', allowedKinds: ['added'] });
  });

  it('rejects impossible counts and duplicate meld declarations', () => {
    expect(
      handModelDefinitionSchema.safeParse({
        targetStructuralTileCount: 14,
        readyStructuralTileCount: 14,
        requiredMeldCount: 4,
        allowedMeldTypes: ['chow'],
        openKongPolicy: { distinction: 'undifferentiated', allowedKinds: [] },
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
        openKongPolicy: { distinction: 'undifferentiated', allowedKinds: [] },
        maxDeclaredMelds: 4,
        flowerPolicy: 'none',
      }).success,
    ).toBe(false);
  });

  it('rejects duplicate and meld-inconsistent open-kong policies', () => {
    const base = {
      targetStructuralTileCount: 14,
      readyStructuralTileCount: 13,
      requiredMeldCount: 4,
      allowedMeldTypes: ['open-kong'],
      maxDeclaredMelds: 4,
      flowerPolicy: 'none',
    } as const;

    expect(
      handModelDefinitionSchema.safeParse({
        ...base,
        openKongPolicy: {
          distinction: 'undifferentiated',
          allowedKinds: ['direct', 'direct'],
        },
      }).success,
    ).toBe(false);
    expect(
      handModelDefinitionSchema.safeParse({
        ...base,
        openKongPolicy: { distinction: 'undifferentiated', allowedKinds: [] },
      }).success,
    ).toBe(false);
    expect(
      handModelDefinitionSchema.safeParse({
        ...base,
        allowedMeldTypes: ['pung'],
        openKongPolicy: { distinction: 'undifferentiated', allowedKinds: ['direct'] },
      }).success,
    ).toBe(false);
  });
});
