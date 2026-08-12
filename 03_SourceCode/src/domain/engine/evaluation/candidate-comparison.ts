import type { CalculationExplanation } from '../explanation/calculation-explanation';
import type { LegalityResult } from '../legality/legality-engine';
import type { PatternRecognitionResult } from '../pattern/pattern-recognizer';
import type { PatternRelationResolutionResult } from '../relation/pattern-relation-resolver';
import type { ScoreBreakdown } from '../scoring/cap-and-extras';
import type { PlacedWinningDecomposition } from '../structure/winning-tile-placement';

export type CandidateResult = Readonly<{
  candidateId: string;
  placed: PlacedWinningDecomposition;
  recognition: PatternRecognitionResult;
  relation: PatternRelationResolutionResult;
  score: ScoreBreakdown;
  legality: LegalityResult;
  explanation: CalculationExplanation;
}>;

export type CandidateComparison = Readonly<{
  orderedCandidates: readonly CandidateResult[];
  highestLegalCandidateIds: readonly string[];
  selectedCandidateId: string | null;
}>;

export function compareCandidateResults(
  candidates: readonly CandidateResult[],
): CandidateComparison {
  const orderedCandidates = Object.freeze(
    [...candidates].sort((left, right) => left.candidateId.localeCompare(right.candidateId)),
  );
  const legal = orderedCandidates.filter(({ legality }) => legality.status === 'legal');
  const highestScore = legal.reduce(
    (highest, candidate) => Math.max(highest, candidate.score.total),
    Number.NEGATIVE_INFINITY,
  );
  const highestLegalCandidateIds = Object.freeze(
    legal.filter(({ score }) => score.total === highestScore).map(({ candidateId }) => candidateId),
  );
  return Object.freeze({
    orderedCandidates,
    highestLegalCandidateIds,
    selectedCandidateId: highestLegalCandidateIds[0] ?? null,
  });
}
