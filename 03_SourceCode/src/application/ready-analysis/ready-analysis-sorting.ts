import type {
  DiscardToReadyCandidate,
  WaitAnalysisResult,
} from '../../domain/engine/ready-analysis';
import { compareTileCodes } from '../../domain/mahjong/tile';

export type WaitSortMode = 'highest-score' | 'wait-count';

function highestLegalScore(result: WaitAnalysisResult): number {
  return result.candidates.reduce(
    (highest, candidate) =>
      candidate.status === 'legal' ? Math.max(highest, candidate.best.score.total) : highest,
    Number.NEGATIVE_INFINITY,
  );
}

export function sortWaitCandidates(
  result: WaitAnalysisResult,
  mode: WaitSortMode,
): WaitAnalysisResult['candidates'] {
  return Object.freeze(
    [...result.candidates].sort((left, right) => {
      const statusRank = { legal: 0, 'pending-context': 1, 'structural-only': 2 } as const;
      const byStatus = statusRank[left.status] - statusRank[right.status];
      if (byStatus !== 0) return byStatus;
      if (mode === 'highest-score' && left.status === 'legal' && right.status === 'legal') {
        const byScore = right.best.score.total - left.best.score.total;
        if (byScore !== 0) return byScore;
      }
      return compareTileCodes(left.tile, right.tile);
    }),
  );
}

export function sortDiscardCandidates(
  candidates: readonly DiscardToReadyCandidate[],
  mode: WaitSortMode,
): readonly DiscardToReadyCandidate[] {
  return Object.freeze(
    [...candidates].sort((left, right) => {
      const priority =
        mode === 'wait-count'
          ? right.waits.legalWaitCount - left.waits.legalWaitCount
          : highestLegalScore(right.waits) - highestLegalScore(left.waits);
      return priority || compareTileCodes(left.discard, right.discard);
    }),
  );
}
