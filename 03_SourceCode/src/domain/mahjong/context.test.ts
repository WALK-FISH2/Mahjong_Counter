import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  createWinContext,
  isKnownContextValue,
  knownContextValue,
  setContextValue,
  setWinMode,
  UNKNOWN_CONTEXT_VALUE,
  type WinMode,
} from './context';

describe('WinContext', () => {
  it('defaults to discard while allowing an explicit self-draw mode', () => {
    expect(createWinContext()).toEqual({ mode: 'discard', values: {} });
    expect(createWinContext('self-draw')).toEqual({ mode: 'self-draw', values: {} });
    expectTypeOf<WinMode>().toEqualTypeOf<'discard' | 'self-draw'>();
  });

  it('distinguishes an unknown value from a known boolean false value', () => {
    const unknown = UNKNOWN_CONTEXT_VALUE;
    const knownFalse = knownContextValue(false);
    const context = createWinContext('discard', {
      seatWindKnown: unknown,
      robbingKong: knownFalse,
    });

    expect(context.values.seatWindKnown).toEqual({ status: 'unknown' });
    expect(context.values.robbingKong).toEqual({ status: 'known', value: false });
    expect(isKnownContextValue(unknown)).toBe(false);
    expect(isKnownContextValue(knownFalse)).toBe(true);
  });

  it('updates mode and dynamic fields immutably', () => {
    const original = createWinContext();
    const withMode = setWinMode(original, 'self-draw');
    const withValue = setContextValue(withMode, 'afterKongReplacement', knownContextValue(true));

    expect(original).toEqual({ mode: 'discard', values: {} });
    expect(withMode).toEqual({ mode: 'self-draw', values: {} });
    expect(withValue).toEqual({
      mode: 'self-draw',
      values: { afterKongReplacement: { status: 'known', value: true } },
    });
  });

  it('roundtrips unknown and false states through plain JSON', () => {
    const context = createWinContext('discard', {
      roundWind: UNKNOWN_CONTEXT_VALUE,
      lastTile: knownContextValue(false),
      seatWind: knownContextValue('south'),
    });

    expect(JSON.parse(JSON.stringify(context))).toEqual(context);
  });
});
