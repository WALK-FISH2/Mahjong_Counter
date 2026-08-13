import { createHandSnapshot, type HandSnapshot } from '../../mahjong/hand';
import { countHandStructure } from '../../mahjong/hand-count';
import type { WinContext } from '../../mahjong/context';
import { countHandTilesByCode, getTileCount, validateHandSnapshot } from '../../mahjong/validation';
import type { TileCode } from '../../mahjong/tile';
import type { RulePackageDefinition } from '../../rules/rule-package';
import { evaluateHand, type SystemEvaluation } from '../evaluation/evaluate-hand';
import type { CandidateResult } from '../evaluation/candidate-comparison';
import type { LegalityReason } from '../legality/legality-engine';
import type { PatternRecognizerRegistry } from '../pattern/pattern-recognizer';
import type { ExtraScoringCalculatorRegistry } from '../scoring/cap-and-extras';
import type { ScoringStrategyRegistry } from '../scoring/scoring-strategy';

export type ReadyAnalysisCapabilities = Readonly<{
  patternRecognizers: PatternRecognizerRegistry;
  scoringStrategies: ScoringStrategyRegistry;
  extraScoringCalculators: ExtraScoringCalculatorRegistry;
}>;

export type WaitAnalysisInput = Readonly<{
  hand: HandSnapshot;
  context: WinContext;
  rule: RulePackageDefinition;
  capabilities: ReadyAnalysisCapabilities;
}>;

export type LegalWaitCandidate = Readonly<{
  tile: TileCode;
  status: 'legal';
  best: CandidateResult;
  highestLegalCandidates: readonly CandidateResult[];
}>;

export type PendingContextWaitCandidate = Readonly<{
  tile: TileCode;
  status: 'pending-context';
  evaluation: SystemEvaluation;
}>;

export type StructuralOnlyWaitCandidate = Readonly<{
  tile: TileCode;
  status: 'structural-only';
  reasons: readonly LegalityReason[];
}>;

export type WaitCandidate =
  LegalWaitCandidate | PendingContextWaitCandidate | StructuralOnlyWaitCandidate;

export type WaitAnalysisResult = Readonly<{
  candidates: readonly WaitCandidate[];
  legalWaitCount: number;
}>;

export type WaitAnalysisInputIssue =
  'WINNING_TILE_MUST_BE_EMPTY' | 'READY_STRUCTURAL_TILE_COUNT_REQUIRED' | 'HAND_VALIDATION_FAILED';

export class WaitAnalysisInputError extends Error {
  readonly issue: WaitAnalysisInputIssue;

  constructor(issue: WaitAnalysisInputIssue) {
    super(`Wait analysis input is invalid: ${issue}.`);
    this.name = 'WaitAnalysisInputError';
    this.issue = issue;
  }
}

function collectIllegalReasons(evaluation: SystemEvaluation): readonly LegalityReason[] {
  const unique = new Map<string, LegalityReason>();
  evaluation.candidates.forEach(({ legality }) => {
    if (legality.status !== 'illegal') return;
    legality.reasons.forEach((reason) => {
      unique.set(JSON.stringify(reason), reason);
    });
  });
  return Object.freeze([...unique.values()]);
}

function classifyCandidate(tile: TileCode, evaluation: SystemEvaluation): WaitCandidate | null {
  if (evaluation.status === 'not-winning') return null;

  if (evaluation.status === 'incomplete-context') {
    return Object.freeze({ tile, status: 'pending-context', evaluation });
  }

  if (evaluation.status === 'structural-win-but-illegal') {
    return Object.freeze({
      tile,
      status: 'structural-only',
      reasons: collectIllegalReasons(evaluation),
    });
  }

  const highestLegalCandidates = Object.freeze(
    evaluation.highestLegalCandidateIds.flatMap((candidateId) => {
      const candidate = evaluation.candidates.find((item) => item.candidateId === candidateId);
      return candidate === undefined ? [] : [candidate];
    }),
  );
  const best = highestLegalCandidates[0];
  if (best === undefined) {
    throw new Error('A legal evaluation must expose at least one highest legal candidate.');
  }
  return Object.freeze({ tile, status: 'legal', best, highestLegalCandidates });
}

export function analyzeWaits(input: WaitAnalysisInput): WaitAnalysisResult {
  if (input.hand.winningTile !== null) {
    throw new WaitAnalysisInputError('WINNING_TILE_MUST_BE_EMPTY');
  }

  if (
    countHandStructure(input.hand).structuralTileCount !==
    input.rule.handModel.readyStructuralTileCount
  ) {
    throw new WaitAnalysisInputError('READY_STRUCTURAL_TILE_COUNT_REQUIRED');
  }

  if (!validateHandSnapshot(input.hand, input.rule.tileSet).isValid) {
    throw new WaitAnalysisInputError('HAND_VALIDATION_FAILED');
  }

  const tileCounts = countHandTilesByCode(input.hand);
  const candidates: WaitCandidate[] = [];

  for (const tile of input.rule.tileSet.enabledTiles) {
    const maximum = input.rule.tileSet.maxCopies[tile];
    if (maximum !== undefined && getTileCount(tileCounts, tile) >= maximum) continue;

    const candidateHand = createHandSnapshot({ ...input.hand, winningTile: tile });
    if (!validateHandSnapshot(candidateHand, input.rule.tileSet).isValid) continue;

    const evaluation = evaluateHand({
      hand: candidateHand,
      context: input.context,
      rule: input.rule,
      patternRecognizers: input.capabilities.patternRecognizers,
      scoringStrategies: input.capabilities.scoringStrategies,
      extraScoringCalculators: input.capabilities.extraScoringCalculators,
    });
    const candidate = classifyCandidate(tile, evaluation);
    if (candidate !== null) candidates.push(candidate);
  }

  return Object.freeze({
    candidates: Object.freeze(candidates),
    legalWaitCount: candidates.filter(({ status }) => status === 'legal').length,
  });
}
