import { describe, expect, it } from 'vitest';

import { createWinContext } from '../../mahjong/context';
import { createHandSnapshot } from '../../mahjong/hand';
import type { TileSetDefinition } from '../../rules/tile-set';
import {
  applyCapAndExtras,
  contextMatchExtraScoringCalculator,
  createExtraScoringCalculatorRegistry,
  ExtraScoringCalculatorUnavailableError,
  tileGroupCountExtraScoringCalculator,
} from './cap-and-extras';

const tileSet: TileSetDefinition = {
  enabledTiles: ['m1', 'spring', 'summer'],
  maxCopies: { m1: 4, spring: 1, summer: 1 },
  groups: [{ id: 'flowers', labelKey: 'flowers', tiles: ['spring', 'summer'] }],
};
const base = {
  strategyKey: 'scoring.additive',
  unit: 'fan',
  total: 7,
  items: [],
};
const countedPatterns = [
  {
    candidate: {
      patternId: 'selfDrawn',
      recognizerKey: 'recognizer.selfDrawn',
      occurrences: 1,
      evidence: [{ evidenceType: 'fixture', facts: {} }],
    },
    status: 'COUNTED' as const,
    reason: 'COUNTED' as const,
  },
  {
    candidate: {
      patternId: 'flowerTiles',
      recognizerKey: 'recognizer.flowerTiles',
      occurrences: 2,
      evidence: [{ evidenceType: 'fixture', facts: {} }],
    },
    status: 'COUNTED' as const,
    reason: 'COUNTED' as const,
  },
];
const registry = createExtraScoringCalculatorRegistry([
  contextMatchExtraScoringCalculator,
  tileGroupCountExtraScoringCalculator,
]);

describe('Cap / Extra scoring', () => {
  it('applies before-cap and after-cap extras in the declared order and retains both totals', () => {
    const score = applyCapAndExtras(
      base,
      {
        strategyKey: 'scoring.additive',
        unit: 'fan',
        parameters: {},
        cap: { enabled: true, value: 8 },
        extras: [
          {
            extraId: 'self-draw',
            calculatorKey: 'scoring.extra.context-match',
            parameters: { patternId: 'selfDrawn', contextId: 'winMode', equals: 'self-draw' },
            mode: 'ADD',
            value: 1,
            capPlacement: 'before-cap',
          },
          {
            extraId: 'flowers',
            calculatorKey: 'scoring.extra.tile-group-count',
            parameters: { patternId: 'flowerTiles', tileGroupId: 'flowers' },
            mode: 'ADD',
            value: 1,
            capPlacement: 'after-cap',
          },
        ],
      },
      {
        hand: createHandSnapshot({ flowers: ['spring', 'summer'] }),
        context: createWinContext('self-draw'),
        tileSet,
        countedPatterns,
      },
      registry,
    );

    expect(score.totalBeforeCap).toBe(8);
    expect(score.cap).toEqual({ enabled: true, value: 8, applied: false, subtotalAfterCap: 8 });
    expect(score.total).toBe(10);
    expect(score.extrasAfterCap[0]).toMatchObject({ occurrences: 2, subtotal: 2 });
  });

  it('caps only values that exceed the threshold and leaves uncapped scoring unchanged', () => {
    const input = {
      hand: createHandSnapshot(),
      context: createWinContext(),
      tileSet,
      countedPatterns: [],
    };
    expect(
      applyCapAndExtras(
        { ...base, total: 9 },
        {
          strategyKey: 'scoring.additive',
          unit: 'fan',
          parameters: {},
          cap: { enabled: true, value: 8 },
        },
        input,
        registry,
      ).cap,
    ).toMatchObject({ applied: true, subtotalAfterCap: 8 });
    expect(
      applyCapAndExtras(
        base,
        {
          strategyKey: 'scoring.additive',
          unit: 'fan',
          parameters: {},
          cap: { enabled: false, value: null },
        },
        input,
        registry,
      ).total,
    ).toBe(7);
  });

  it('fails closed for an unknown extra calculator and never executes package code', () => {
    expect(() =>
      applyCapAndExtras(
        base,
        {
          strategyKey: 'scoring.additive',
          unit: 'fan',
          parameters: {},
          extras: [
            {
              extraId: 'unknown',
              calculatorKey: 'remote.formula',
              parameters: { patternId: 'selfDrawn' },
              mode: 'ADD',
              value: 1,
              capPlacement: 'before-cap',
            },
          ],
        },
        { hand: createHandSnapshot(), context: createWinContext(), tileSet, countedPatterns },
        registry,
      ),
    ).toThrow(ExtraScoringCalculatorUnavailableError);
  });

  it('moves patterns represented by extras out of the base subtotal instead of double counting', () => {
    const score = applyCapAndExtras(
      {
        ...base,
        total: 3,
        items: [
          {
            patternId: 'selfDrawn',
            occurrences: 1,
            unitValue: 1,
            subtotal: 1,
            unit: 'fan',
          },
          {
            patternId: 'flowerTiles',
            occurrences: 2,
            unitValue: 1,
            subtotal: 2,
            unit: 'fan',
          },
        ],
      },
      {
        strategyKey: 'scoring.additive',
        unit: 'fan',
        parameters: {},
        extras: [
          {
            extraId: 'self-draw',
            calculatorKey: 'scoring.extra.context-match',
            parameters: { patternId: 'selfDrawn', contextId: 'winMode', equals: 'self-draw' },
            mode: 'ADD',
            value: 1,
            capPlacement: 'before-cap',
          },
          {
            extraId: 'flowers',
            calculatorKey: 'scoring.extra.tile-group-count',
            parameters: { patternId: 'flowerTiles', tileGroupId: 'flowers' },
            mode: 'ADD',
            value: 1,
            capPlacement: 'before-cap',
          },
        ],
      },
      {
        hand: createHandSnapshot({ flowers: ['spring', 'summer'] }),
        context: createWinContext('self-draw'),
        tileSet,
        countedPatterns,
      },
      registry,
    );

    expect(score.base).toMatchObject({ total: 0, items: [] });
    expect(score.total).toBe(3);
  });

  it('accepts a validated occurrence override for hand-unverified scoring flows', () => {
    const score = applyCapAndExtras(
      {
        ...base,
        total: 1,
        items: [
          { patternId: 'flowerTiles', occurrences: 1, unitValue: 1, subtotal: 1, unit: 'fan' },
        ],
      },
      {
        strategyKey: 'scoring.additive',
        unit: 'fan',
        parameters: {},
        extras: [
          {
            extraId: 'flowers',
            calculatorKey: 'scoring.extra.tile-group-count',
            parameters: { patternId: 'flowerTiles', tileGroupId: 'flowers' },
            mode: 'ADD',
            value: 1,
            capPlacement: 'before-cap',
          },
        ],
      },
      {
        hand: createHandSnapshot(),
        context: createWinContext(),
        tileSet,
        countedPatterns,
        occurrenceOverrides: { flowerTiles: 1 },
      },
      registry,
    );

    expect(score.extrasBeforeCap[0]).toMatchObject({ occurrences: 1, subtotal: 1 });
    expect(score.total).toBe(1);
  });
});
