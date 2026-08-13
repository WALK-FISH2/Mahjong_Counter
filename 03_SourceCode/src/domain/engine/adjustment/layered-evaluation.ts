import type { FanAdjustment, TemporaryRuleAdjustment } from '../../mahjong/calculator-document';
import type { SystemEvaluation } from '../evaluation';
import type { UserAdjustedScore } from './fan-adjustment';

export type EvaluationLayer = 'preset' | 'session-rule' | 'user-adjustment';

export type LayeredEvaluation = Readonly<{
  preset: SystemEvaluation;
  sessionRule?: Readonly<{
    adjustment: TemporaryRuleAdjustment;
    evaluation: SystemEvaluation;
  }>;
  userAdjustment?: Readonly<{
    baseLayer: 'preset' | 'session-rule';
    adjustments: readonly FanAdjustment[];
    result: UserAdjustedScore;
  }>;
}>;

export function getBaseEvaluation(
  layered: LayeredEvaluation,
  layer: EvaluationLayer,
): SystemEvaluation {
  if (layer === 'preset') return layered.preset;
  return layered.sessionRule?.evaluation ?? layered.preset;
}
