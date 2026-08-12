import { describe, expect, it } from 'vitest';

import { createWinContext, knownContextValue } from '../../mahjong/context';
import type { ContextDefinition } from '../../rules/context-definition';
import { evaluateLegality } from './legality-engine';

const contexts: readonly ContextDefinition[] = [
  {
    contextId: 'seatWind',
    labelKey: 'seat',
    valueType: 'single-select',
    required: true,
    displayGroup: 'primary',
    applicableWinModes: ['discard', 'self-draw'],
  },
];

describe('Legality Engine', () => {
  it('separates minimum fan legality from the score calculation', () => {
    expect(
      evaluateLegality(
        7,
        { minimumFan: 8, onMissingRequiredContext: 'incomplete-context' },
        [],
        createWinContext(),
      ),
    ).toEqual({
      status: 'illegal',
      reasons: [{ reasonCode: 'MINIMUM_FAN_NOT_MET', data: { actualFan: 7, minimumFan: 8 } }],
    });
    expect(
      evaluateLegality(
        8,
        { minimumFan: 8, onMissingRequiredContext: 'incomplete-context' },
        [],
        createWinContext(),
      ),
    ).toEqual({ status: 'legal' });
  });

  it('reports missing required context before returning a formal legality result', () => {
    expect(
      evaluateLegality(
        88,
        { minimumFan: 0, onMissingRequiredContext: 'incomplete-context' },
        contexts,
        createWinContext(),
      ),
    ).toEqual({ status: 'incomplete-context', missingContextIds: ['seatWind'] });
    expect(
      evaluateLegality(
        0,
        { minimumFan: 0, onMissingRequiredContext: 'incomplete-context' },
        contexts,
        createWinContext('discard', { seatWind: knownContextValue('east') }),
      ),
    ).toEqual({ status: 'legal' });
  });
});
