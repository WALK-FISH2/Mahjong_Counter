import type { CandidateResult, SystemEvaluation } from '../evaluation';
import {
  applyCapAndExtras,
  type ExtraScoringCalculatorRegistry,
  type ScoreBreakdown,
} from '../scoring/cap-and-extras';
import { scoreResolvedPatterns, type ScoringStrategyRegistry } from '../scoring/scoring-strategy';
import type { LegalityResult } from '../legality/legality-engine';
import type { ResolvedPattern } from '../relation/pattern-relation-resolver';
import type { WinContext } from '../../mahjong/context';
import type { FanAdjustment } from '../../mahjong/calculator-document';
import type { HandSnapshot } from '../../mahjong/hand';
import type { RulePackageDefinition } from '../../rules/rule-package';

export const FORCE_INCLUDE_REASONS = [
  'COVERED',
  'MUTEX',
  'NON_REPEAT',
  'HIGHER_SELECTED',
  'SAME_SET_ALREADY_USED',
] as const;

export type FanAdjustmentStaleReason =
  | 'PATTERN_NOT_RECOGNIZED'
  | 'TARGET_NOT_COUNTED'
  | 'TARGET_NOT_EXCLUDED'
  | 'CONFLICT_NOT_FORCE_INCLUDEABLE'
  | 'CONFLICT_NOT_CONFIRMED'
  | 'CONFLICT_CHANGED';

export type FanAdjustmentState =
  | Readonly<{ status: 'active'; adjustment: FanAdjustment; conflictSignature?: string }>
  | Readonly<{
      status: 'stale';
      adjustment: FanAdjustment;
      reasonCode: FanAdjustmentStaleReason;
      currentConflictSignature?: string;
    }>;

export type UserAdjustedPattern = Readonly<{
  resolved: ResolvedPattern;
  displayStatus: 'COUNTED' | 'EXCLUDED';
  adjustmentAction?: FanAdjustment['action'];
}>;

export type UserAdjustedScore = Readonly<{
  candidateId: string;
  baseEvaluationStatus: SystemEvaluation['status'];
  baseLegality: LegalityResult;
  score: ScoreBreakdown;
  patterns: readonly UserAdjustedPattern[];
  adjustmentStates: readonly FanAdjustmentState[];
}>;

export type ApplyFanAdjustmentsInput = Readonly<{
  baseEvaluationStatus: SystemEvaluation['status'];
  candidate: CandidateResult;
  adjustments: readonly FanAdjustment[];
  hand: HandSnapshot;
  context: WinContext;
  rule: RulePackageDefinition;
  scoringStrategies: ScoringStrategyRegistry;
  extraScoringCalculators: ExtraScoringCalculatorRegistry;
}>;

function isForceIncludeable(resolved: ResolvedPattern): boolean {
  return FORCE_INCLUDE_REASONS.includes(resolved.reason as (typeof FORCE_INCLUDE_REASONS)[number]);
}

export function getFanAdjustmentConflictSignature(resolved: ResolvedPattern): string {
  return [
    resolved.reason,
    resolved.excludedByPatternId ?? 'none',
    resolved.relationType ?? 'none',
  ].join(':');
}

export function createFanAdjustment(
  candidate: CandidateResult,
  patternId: string,
  action: FanAdjustment['action'],
): FanAdjustment | null {
  const recognized = candidate.relation.all.find(
    ({ candidate: pattern }) => pattern.patternId === patternId,
  );
  if (recognized === undefined) return null;
  if (action === 'exclude') {
    return recognized.status === 'COUNTED'
      ? Object.freeze({ patternId, action: 'exclude' as const })
      : null;
  }
  if (recognized.status !== 'EXCLUDED' || !isForceIncludeable(recognized)) return null;
  return Object.freeze({
    patternId,
    action: 'force-include' as const,
    confirmedConflictSignature: getFanAdjustmentConflictSignature(recognized),
  });
}

function resolveAdjustment(
  candidate: CandidateResult,
  adjustment: FanAdjustment,
): FanAdjustmentState {
  const recognized = candidate.relation.all.find(
    ({ candidate: pattern }) => pattern.patternId === adjustment.patternId,
  );
  if (recognized === undefined) {
    return Object.freeze({ status: 'stale', adjustment, reasonCode: 'PATTERN_NOT_RECOGNIZED' });
  }
  if (adjustment.action === 'exclude') {
    return recognized.status === 'COUNTED'
      ? Object.freeze({ status: 'active', adjustment })
      : Object.freeze({ status: 'stale', adjustment, reasonCode: 'TARGET_NOT_COUNTED' });
  }
  if (recognized.status !== 'EXCLUDED') {
    return Object.freeze({ status: 'stale', adjustment, reasonCode: 'TARGET_NOT_EXCLUDED' });
  }
  if (!isForceIncludeable(recognized)) {
    return Object.freeze({
      status: 'stale',
      adjustment,
      reasonCode: 'CONFLICT_NOT_FORCE_INCLUDEABLE',
    });
  }
  const currentConflictSignature = getFanAdjustmentConflictSignature(recognized);
  if (adjustment.confirmedConflictSignature === undefined) {
    return Object.freeze({
      status: 'stale',
      adjustment,
      reasonCode: 'CONFLICT_NOT_CONFIRMED',
      currentConflictSignature,
    });
  }
  if (adjustment.confirmedConflictSignature !== currentConflictSignature) {
    return Object.freeze({
      status: 'stale',
      adjustment,
      reasonCode: 'CONFLICT_CHANGED',
      currentConflictSignature,
    });
  }
  return Object.freeze({
    status: 'active',
    adjustment,
    conflictSignature: currentConflictSignature,
  });
}

export function inspectFanAdjustments(
  candidate: CandidateResult,
  adjustments: readonly FanAdjustment[],
): readonly FanAdjustmentState[] {
  return Object.freeze(adjustments.map((adjustment) => resolveAdjustment(candidate, adjustment)));
}

export function applyFanAdjustments(input: ApplyFanAdjustmentsInput): UserAdjustedScore {
  const adjustmentStates = Object.freeze(inspectFanAdjustments(input.candidate, input.adjustments));
  const activeByPatternId = new Map(
    adjustmentStates.flatMap((state) =>
      state.status === 'active' ? [[state.adjustment.patternId, state.adjustment] as const] : [],
    ),
  );
  const patterns = Object.freeze(
    input.candidate.relation.all.map((resolved): UserAdjustedPattern => {
      const adjustment = activeByPatternId.get(resolved.candidate.patternId);
      if (adjustment?.action === 'exclude') {
        return Object.freeze({
          resolved,
          displayStatus: 'EXCLUDED',
          adjustmentAction: adjustment.action,
        });
      }
      if (adjustment?.action === 'force-include') {
        return Object.freeze({
          resolved,
          displayStatus: 'COUNTED',
          adjustmentAction: adjustment.action,
        });
      }
      return Object.freeze({ resolved, displayStatus: resolved.status });
    }),
  );
  const counted = patterns
    .filter(({ displayStatus }) => displayStatus === 'COUNTED')
    .map(({ resolved }) =>
      resolved.status === 'COUNTED'
        ? resolved
        : Object.freeze({
            candidate: resolved.candidate,
            status: 'COUNTED' as const,
            reason: 'COUNTED' as const,
          }),
    );
  const baseScore = scoreResolvedPatterns(
    input.rule.scoring,
    input.rule.patterns,
    counted,
    input.scoringStrategies,
  );
  const score = applyCapAndExtras(
    baseScore,
    input.rule.scoring,
    {
      hand: input.hand,
      context: input.context,
      tileSet: input.rule.tileSet,
      countedPatterns: counted,
    },
    input.extraScoringCalculators,
  );
  return Object.freeze({
    candidateId: input.candidate.candidateId,
    baseEvaluationStatus: input.baseEvaluationStatus,
    baseLegality: input.candidate.legality,
    score,
    patterns,
    adjustmentStates,
  });
}
