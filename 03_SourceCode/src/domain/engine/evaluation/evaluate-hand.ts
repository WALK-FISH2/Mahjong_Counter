import type { RuleRef } from '../../mahjong/calculator-document';
import type { WinContext } from '../../mahjong/context';
import type { HandSnapshot } from '../../mahjong/hand';
import { validateHandSnapshot, type HandValidationIssue } from '../../mahjong/validation';
import type { RulePackageDefinition } from '../../rules/rule-package';
import { createCalculationExplanation } from '../explanation/calculation-explanation';
import { evaluateLegality } from '../legality/legality-engine';
import {
  recognizePlacedCandidates,
  type PatternRecognizerRegistry,
} from '../pattern/pattern-recognizer';
import { resolvePatternRelations } from '../relation/pattern-relation-resolver';
import { applyCapAndExtras, type ExtraScoringCalculatorRegistry } from '../scoring/cap-and-extras';
import { scoreResolvedPatterns, type ScoringStrategyRegistry } from '../scoring/scoring-strategy';
import {
  enumerateWinningDecompositions,
  getWinningDecompositionKey,
  type StructureEnumerationResult,
} from '../structure/structure-engine';
import {
  placeWinningTile,
  type PlacedWinningDecomposition,
} from '../structure/winning-tile-placement';
import { compareCandidateResults, type CandidateResult } from './candidate-comparison';

export type EvaluateHandInput = Readonly<{
  hand: HandSnapshot;
  context: WinContext;
  rule: RulePackageDefinition;
  patternRecognizers: PatternRecognizerRegistry;
  scoringStrategies: ScoringStrategyRegistry;
  extraScoringCalculators: ExtraScoringCalculatorRegistry;
}>;

type EvaluationBase = Readonly<{
  ruleRef: RuleRef;
  candidates: readonly CandidateResult[];
  highestLegalCandidateIds: readonly string[];
  selectedCandidateId: string | null;
}>;

export type SystemEvaluation =
  | (EvaluationBase & Readonly<{ status: 'legal-win' }>)
  | (EvaluationBase &
      Readonly<{
        status: 'structural-win-but-illegal';
      }>)
  | (EvaluationBase &
      Readonly<{
        status: 'not-winning';
        structure: StructureEnumerationResult;
      }>)
  | (EvaluationBase & Readonly<{ status: 'incomplete-context' }>);

export class HandEvaluationValidationError extends Error {
  readonly issues: readonly HandValidationIssue[];

  constructor(issues: readonly HandValidationIssue[]) {
    super('HandSnapshot failed hard validation before evaluation.');
    this.name = 'HandEvaluationValidationError';
    this.issues = Object.freeze([...issues]);
  }
}

function placementKey(placed: PlacedWinningDecomposition): string {
  const placement = placed.winningTilePlacement;
  switch (placement.kind) {
    case 'pair':
      return `pair:${placement.tile}`;
    case 'sequence':
      return `sequence:${placement.meldIndex}:${placement.tileIndex}`;
    case 'triplet':
      return `triplet:${placement.meldIndex}`;
    case 'seven-pairs-pair':
      return `seven-pairs-pair:${placement.pairIndex}`;
    case 'thirteen-orphans-pair':
    case 'thirteen-orphans-single':
      return `${placement.kind}:${placement.tile}`;
  }
}

function candidateId(placed: PlacedWinningDecomposition): string {
  return `${getWinningDecompositionKey(placed.decomposition)}:${placementKey(placed)}`;
}

function base(rule: RulePackageDefinition): EvaluationBase {
  return Object.freeze({
    ruleRef: Object.freeze({
      ruleId: rule.manifest.ruleId,
      ruleVersion: rule.manifest.ruleVersion,
    }),
    candidates: Object.freeze([]),
    highestLegalCandidateIds: Object.freeze([]),
    selectedCandidateId: null,
  });
}

export function evaluateHand(input: EvaluateHandInput): SystemEvaluation {
  const validation = validateHandSnapshot(input.hand, input.rule.tileSet);
  if (!validation.isValid) {
    throw new HandEvaluationValidationError(validation.issues);
  }

  const structure = enumerateWinningDecompositions({
    hand: input.hand,
    handModel: input.rule.handModel,
    structures: input.rule.structures,
  });
  const placedCandidates = placeWinningTile(input.hand, structure.decompositions);
  if (placedCandidates.length === 0) {
    return Object.freeze({ ...base(input.rule), status: 'not-winning', structure });
  }

  const recognized = recognizePlacedCandidates(
    input.hand,
    input.context,
    placedCandidates,
    input.rule.patterns,
    input.rule.structures,
    input.patternRecognizers,
  );
  const candidates = recognized.map(({ placed, recognition }) => {
    const relation = resolvePatternRelations(
      recognition.candidates,
      input.rule.patterns,
      input.rule.relations,
    );
    const baseScore = scoreResolvedPatterns(
      input.rule.scoring,
      input.rule.patterns,
      relation.counted,
      input.scoringStrategies,
    );
    const score = applyCapAndExtras(
      baseScore,
      input.rule.scoring,
      {
        hand: input.hand,
        context: input.context,
        tileSet: input.rule.tileSet,
        countedPatterns: relation.counted,
      },
      input.extraScoringCalculators,
    );
    const legality = evaluateLegality(
      score.total,
      input.rule.legality,
      input.rule.contexts,
      input.context,
    );
    const explanation = createCalculationExplanation({
      rule: input.rule,
      decomposition: placed.decomposition,
      winningTilePlacement: placed.winningTilePlacement,
      recognition,
      relation,
      score,
      legality,
    });
    return Object.freeze({
      candidateId: candidateId(placed),
      placed,
      recognition,
      relation,
      score,
      legality,
      explanation,
    });
  });
  const comparison = compareCandidateResults(candidates);
  const resultBase: EvaluationBase = Object.freeze({
    ruleRef: Object.freeze({
      ruleId: input.rule.manifest.ruleId,
      ruleVersion: input.rule.manifest.ruleVersion,
    }),
    candidates: comparison.orderedCandidates,
    highestLegalCandidateIds: comparison.highestLegalCandidateIds,
    selectedCandidateId: comparison.selectedCandidateId,
  });
  if (comparison.highestLegalCandidateIds.length > 0) {
    return Object.freeze({ ...resultBase, status: 'legal-win' });
  }
  if (candidates.some(({ legality }) => legality.status === 'incomplete-context')) {
    return Object.freeze({ ...resultBase, status: 'incomplete-context' });
  }
  return Object.freeze({ ...resultBase, status: 'structural-win-but-illegal' });
}
