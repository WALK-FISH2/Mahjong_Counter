import { EMPTY_HAND_SNAPSHOT, type RuleRef, type WinContext } from '../../domain/mahjong';
import { evaluateLegality, type LegalityResult } from '../../domain/engine/legality';
import {
  resolvePatternRelations,
  type PatternRelationResolutionResult,
} from '../../domain/engine/relation';
import {
  applyCapAndExtras,
  scoreResolvedPatterns,
  type ExtraScoringCalculatorRegistry,
  type ScoreBreakdown,
  type ScoringStrategyRegistry,
} from '../../domain/engine/scoring';
import type { PatternCandidate } from '../../domain/engine/pattern';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';

export type QuickCalcInput = Readonly<{
  ruleRef: RuleRef;
  selectedPatternIds: readonly string[];
  context: WinContext;
}>;

export type QuickCalcResult = Readonly<{
  ruleRef: RuleRef;
  selectedPatternIds: readonly string[];
  relation: PatternRelationResolutionResult;
  score: ScoreBreakdown;
  legality: LegalityResult;
  unverifiedByHand: true;
}>;

export type QuickCalcCapabilities = Readonly<{
  scoringStrategies: ScoringStrategyRegistry;
  extraScoringCalculators: ExtraScoringCalculatorRegistry;
}>;

export type QuickCalcEvaluator = (
  rule: RulePackageDefinition,
  input: QuickCalcInput,
) => QuickCalcResult;

export class QuickCalcInputError extends Error {
  constructor(readonly reasonCode: 'RULE_REF_MISMATCH' | 'PATTERN_NOT_AVAILABLE') {
    super(reasonCode);
    this.name = 'QuickCalcInputError';
  }
}

function selectedCandidates(
  rule: RulePackageDefinition,
  selectedPatternIds: readonly string[],
): Readonly<{ ids: readonly string[]; candidates: readonly PatternCandidate[] }> {
  const requested = new Set(selectedPatternIds);
  const available = new Set(
    rule.patterns.filter(({ enabled }) => enabled).map(({ patternId }) => patternId),
  );
  if ([...requested].some((patternId) => !available.has(patternId))) {
    throw new QuickCalcInputError('PATTERN_NOT_AVAILABLE');
  }
  const selected = rule.patterns.filter(({ patternId }) => requested.has(patternId));
  return Object.freeze({
    ids: Object.freeze(selected.map(({ patternId }) => patternId)),
    candidates: Object.freeze(
      selected.map((pattern): PatternCandidate =>
        Object.freeze({
          patternId: pattern.patternId,
          recognizerKey: pattern.recognizerKey,
          occurrences: 1,
          evidence: Object.freeze([
            Object.freeze({
              evidenceType: 'quick-calc-user-selection',
              facts: Object.freeze({ unverifiedByHand: true }),
            }),
          ]),
        }),
      ),
    ),
  });
}

export function evaluateQuickCalc(
  rule: RulePackageDefinition,
  input: QuickCalcInput,
  capabilities: QuickCalcCapabilities,
): QuickCalcResult {
  if (
    input.ruleRef.ruleId !== rule.manifest.ruleId ||
    input.ruleRef.ruleVersion !== rule.manifest.ruleVersion
  ) {
    throw new QuickCalcInputError('RULE_REF_MISMATCH');
  }
  const selected = selectedCandidates(rule, input.selectedPatternIds);
  const relation = resolvePatternRelations(selected.candidates, rule.patterns, rule.relations);
  const baseScore = scoreResolvedPatterns(
    rule.scoring,
    rule.patterns,
    relation.counted,
    capabilities.scoringStrategies,
  );
  const score = applyCapAndExtras(
    baseScore,
    rule.scoring,
    {
      hand: EMPTY_HAND_SNAPSHOT,
      context: input.context,
      tileSet: rule.tileSet,
      countedPatterns: relation.counted,
      occurrenceOverrides: Object.freeze(
        Object.fromEntries(
          relation.counted.map(({ candidate }) => [candidate.patternId, candidate.occurrences]),
        ),
      ),
    },
    capabilities.extraScoringCalculators,
  );
  return Object.freeze({
    ruleRef: Object.freeze({ ...input.ruleRef }),
    selectedPatternIds: selected.ids,
    relation,
    score,
    legality: evaluateLegality(score.total, rule.legality, rule.contexts, input.context),
    unverifiedByHand: true,
  });
}

export function createQuickCalcEvaluator(capabilities: QuickCalcCapabilities): QuickCalcEvaluator {
  return (rule, input) => evaluateQuickCalc(rule, input, capabilities);
}

export function formatQuickCalcText(rule: RulePackageDefinition, result: QuickCalcResult): string {
  const names = new Map(rule.patterns.map(({ patternId, name }) => [patternId, name]));
  const counted = result.relation.counted
    .map(({ candidate }) => names.get(candidate.patternId) ?? candidate.patternId)
    .join('、');
  const excluded = result.relation.excluded
    .map(
      ({ candidate, reason }) =>
        `${names.get(candidate.patternId) ?? candidate.patternId}（${reason}）`,
    )
    .join('、');
  return [
    '快速算番（用户选择，未经牌面验证）',
    `规则：${rule.manifest.displayName} ${result.ruleRef.ruleId}@${result.ruleRef.ruleVersion}`,
    `合计：${result.score.total} ${result.score.unit}`,
    `已计入：${counted || '无'}`,
    `未计入：${excluded || '无'}`,
    `门槛状态：${result.legality.status}`,
  ].join('\n');
}
