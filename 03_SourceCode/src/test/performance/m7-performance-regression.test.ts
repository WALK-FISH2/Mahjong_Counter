import { performance } from 'node:perf_hooks';
import { cpus, platform, release } from 'node:os';
import { describe, expect, it } from 'vitest';

import { commonSimplePatternRecognizerRegistry } from '../../content/rules/common-simple/pattern-recognizers';
import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../content/rules/common-simple/scoring-capabilities';
import { evaluateHand } from '../../domain/engine/evaluation';
import { analyzeDiscardToReady, analyzeWaits } from '../../domain/engine/ready-analysis';
import { createHandSnapshot, createWinContext, knownContextValue } from '../../domain/mahjong';

const WARMUP_RUNS = 3;
const MEASURED_RUNS = 15;
const context = createWinContext('discard', {
  seatWind: knownContextValue('south'),
  roundWind: knownContextValue('west'),
});
const capabilities = Object.freeze({
  patternRecognizers: commonSimplePatternRecognizerRegistry,
  scoringStrategies: commonSimpleScoringStrategyRegistry,
  extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
});
const readyHand = createHandSnapshot({
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
const ordinaryWin = createHandSnapshot({ ...readyHand, winningTile: 'white' });
const complexWin = createHandSnapshot({
  concealed: ['m1', 'm1', 'm2', 'm2', 'm3', 'm3', 'p4', 'p4', 'p5', 'p5', 'p6', 'p6', 'east'],
  winningTile: 'east',
});
const discardHand = createHandSnapshot({ concealed: [...readyHand.concealed, 'm9'] });

type BaselineRow = Readonly<{
  caseId: string;
  targetMs: number;
  samplesMs: readonly number[];
  medianMs: number;
  p95Ms: number;
  maxMs: number;
}>;

function percentile(samples: readonly number[], fraction: number): number {
  const ordered = [...samples].sort((left, right) => left - right);
  return ordered[Math.ceil(ordered.length * fraction) - 1] ?? 0;
}

function measure(caseId: string, targetMs: number, run: () => unknown): BaselineRow {
  for (let index = 0; index < WARMUP_RUNS; index += 1) run();
  const samplesMs = Array.from({ length: MEASURED_RUNS }, () => {
    const start = performance.now();
    run();
    return Number((performance.now() - start).toFixed(3));
  });
  return Object.freeze({
    caseId,
    targetMs,
    samplesMs: Object.freeze(samplesMs),
    medianMs: percentile(samplesMs, 0.5),
    p95Ms: percentile(samplesMs, 0.95),
    maxMs: Math.max(...samplesMs),
  });
}

describe('T712 M7 performance regression baseline', () => {
  it('records fixed uncached engine cases within the product response targets', () => {
    const evaluate = (hand: typeof ordinaryWin) =>
      evaluateHand({
        hand,
        context,
        rule: commonSimpleRulePackage,
        patternRecognizers: capabilities.patternRecognizers,
        scoringStrategies: capabilities.scoringStrategies,
        extraScoringCalculators: capabilities.extraScoringCalculators,
      });
    const rows = [
      measure('ordinary-win', 1_000, () => evaluate(ordinaryWin)),
      measure('complex-multi-decomposition-win', 1_000, () => evaluate(complexWin)),
      measure('wait-analysis', 3_000, () =>
        analyzeWaits({ hand: readyHand, context, rule: commonSimpleRulePackage, capabilities }),
      ),
      measure('discard-to-ready-analysis', 3_000, () =>
        analyzeDiscardToReady({
          hand: discardHand,
          context,
          rule: commonSimpleRulePackage,
          capabilities,
        }),
      ),
    ];

    console.log(
      `T712_BASELINE=${JSON.stringify({
        environment: {
          platform: platform(),
          release: release(),
          cpu: cpus()[0]?.model ?? 'unknown',
          logicalCpuCount: cpus().length,
          node: process.version,
        },
        warmupRuns: WARMUP_RUNS,
        measuredRuns: MEASURED_RUNS,
        statistic: 'p95 of uncached wall-clock samples',
        rows,
      })}`,
    );

    rows.forEach((row) => expect(row.p95Ms, row.caseId).toBeLessThanOrEqual(row.targetMs));
  });
});
