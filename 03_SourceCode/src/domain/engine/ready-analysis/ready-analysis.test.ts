import { describe, expect, it } from 'vitest';

import { commonSimplePatternRecognizerRegistry } from '../../../content/rules/common-simple/pattern-recognizers';
import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../../content/rules/common-simple/scoring-capabilities';
import { commonSimpleRulePackage } from '../../../content/rules/common-simple/parsed-rule-package';
import { createWinContext, knownContextValue } from '../../mahjong/context';
import { createHandSnapshot } from '../../mahjong/hand';
import { analyzeDiscardToReady } from './discard-to-ready';
import { analyzeWaits, WaitAnalysisInputError } from './wait-analysis';

const capabilities = Object.freeze({
  patternRecognizers: commonSimplePatternRecognizerRegistry,
  scoringStrategies: commonSimpleScoringStrategyRegistry,
  extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
});
const completeContext = createWinContext('discard', {
  seatWind: knownContextValue('south'),
  roundWind: knownContextValue('west'),
});
const standardReadyHand = createHandSnapshot({
  concealed: [
    'm1',
    'm2',
    'm3',
    'p1',
    'p2',
    'p3',
    's1',
    's2',
    's3',
    'east',
    'east',
    'east',
    'white',
  ],
});

describe('Wait Analysis Domain', () => {
  it('enumerates RulePackage tiles and classifies a formal legal evaluation', () => {
    const result = analyzeWaits({
      hand: standardReadyHand,
      context: completeContext,
      rule: commonSimpleRulePackage,
      capabilities,
    });
    const white = result.candidates.find(({ tile }) => tile === 'white');

    expect(white?.status).toBe('legal');
    expect(white?.status === 'legal' ? white.best.score.total : null).toBeGreaterThanOrEqual(0);
    expect(white?.status === 'legal' ? white.highestLegalCandidates.length : 0).toBeGreaterThan(0);
    expect(new Set(result.candidates.map(({ tile }) => tile)).size).toBe(result.candidates.length);
  });

  it('marks a real structural win as pending when required context is incomplete', () => {
    const result = analyzeWaits({
      hand: standardReadyHand,
      context: createWinContext('discard'),
      rule: commonSimpleRulePackage,
      capabilities,
    });

    expect(result.candidates.find(({ tile }) => tile === 'white')?.status).toBe('pending-context');
    expect(result.legalWaitCount).toBe(0);
  });

  it('keeps structural-only candidates separate from legal waits', () => {
    const strictRule = Object.freeze({
      ...commonSimpleRulePackage,
      legality: Object.freeze({ ...commonSimpleRulePackage.legality, minimumFan: 1_000 }),
    });
    const result = analyzeWaits({
      hand: standardReadyHand,
      context: completeContext,
      rule: strictRule,
      capabilities,
    });
    const white = result.candidates.find(({ tile }) => tile === 'white');

    expect(white?.status).toBe('structural-only');
    const reason = white?.status === 'structural-only' ? white.reasons[0] : undefined;
    expect(reason?.reasonCode).toBe('MINIMUM_FAN_NOT_MET');
    expect(reason?.data.minimumFan).toBe(1_000);
    expect(typeof reason?.data.actualFan).toBe('number');
    expect(result.legalWaitCount).toBe(0);
  });

  it('runs every enabled structure instead of stopping at the first one', () => {
    const sevenPairsReady = createHandSnapshot({
      concealed: ['m1', 'm1', 'm2', 'm2', 'm3', 'm3', 'p4', 'p4', 'p5', 'p5', 'p6', 'p6', 'east'],
    });
    const equalValueRule = Object.freeze({
      ...commonSimpleRulePackage,
      patterns: Object.freeze(
        commonSimpleRulePackage.patterns.map((pattern) => Object.freeze({ ...pattern, value: 0 })),
      ),
    });
    const result = analyzeWaits({
      hand: sevenPairsReady,
      context: completeContext,
      rule: equalValueRule,
      capabilities,
    });
    const east = result.candidates.find(({ tile }) => tile === 'east');

    expect(east?.status).toBe('legal');
    expect(
      east?.status === 'legal'
        ? new Set(
            east.highestLegalCandidates.map(({ placed }) => placed.decomposition.structureKey),
          )
        : new Set(),
    ).toEqual(new Set(['standard-meld-pair', 'seven-pairs']));
  });

  it('enforces the rule-defined ready count and keeps the input unchanged', () => {
    const hand = createHandSnapshot({ concealed: ['m1'] });
    expect(() =>
      analyzeWaits({
        hand,
        context: completeContext,
        rule: commonSimpleRulePackage,
        capabilities,
      }),
    ).toThrowError(WaitAnalysisInputError);
    expect(hand.concealed).toEqual(['m1']);
  });
});

describe('Discard-to-ready Domain', () => {
  it('enumerates distinct concealed discards and keeps only one-step legal ready results', () => {
    const hand = createHandSnapshot({
      concealed: [...standardReadyHand.concealed, 'm9'],
    });
    const result = analyzeDiscardToReady({
      hand,
      context: completeContext,
      rule: commonSimpleRulePackage,
      capabilities,
    });
    const discard = result.candidates.find(({ discard: tile }) => tile === 'm9');

    expect(discard?.waits.candidates).toContainEqual(
      expect.objectContaining({ tile: 'white', status: 'legal' }),
    );
    expect(new Set(result.candidates.map(({ discard: tile }) => tile)).size).toBe(
      result.candidates.length,
    );
    expect(hand.concealed).toHaveLength(14);
  });

  it('returns no candidate for a complete hand with no one-discard legal wait', () => {
    const hand = createHandSnapshot({
      concealed: [
        'm1',
        'm1',
        'm1',
        'm1',
        'm2',
        'm4',
        'm6',
        'm8',
        'p2',
        'p4',
        'p6',
        'p8',
        's2',
        's4',
      ],
    });
    const result = analyzeDiscardToReady({
      hand,
      context: completeContext,
      rule: commonSimpleRulePackage,
      capabilities,
    });

    expect(result.candidates).toEqual([]);
  });
});
