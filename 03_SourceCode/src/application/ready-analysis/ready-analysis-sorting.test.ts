import { describe, expect, it } from 'vitest';

import type {
  DiscardToReadyCandidate,
  WaitAnalysisResult,
} from '../../domain/engine/ready-analysis';
import type { CandidateResult } from '../../domain/engine/evaluation';
import { sortDiscardCandidates, sortWaitCandidates } from './ready-analysis-sorting';

function legal(tile: 'm1' | 'm2' | 'm3', score: number) {
  const best = { score: { total: score } } as CandidateResult;
  return { tile, status: 'legal' as const, best, highestLegalCandidates: [best] };
}

function waits(...candidates: ReturnType<typeof legal>[]): WaitAnalysisResult {
  return { candidates, legalWaitCount: candidates.length };
}

describe('ready-analysis stable sorting', () => {
  it('sorts legal waits by score and resolves ties in stable tile order', () => {
    const result = waits(legal('m3', 4), legal('m2', 8), legal('m1', 8));
    expect(sortWaitCandidates(result, 'highest-score').map(({ tile }) => tile)).toEqual([
      'm1',
      'm2',
      'm3',
    ]);
  });

  it('switches discard priorities without changing deterministic tie order', () => {
    const candidates: readonly DiscardToReadyCandidate[] = [
      { discard: 'm3', waits: waits(legal('m1', 12)) },
      { discard: 'm2', waits: waits(legal('m1', 8), legal('m2', 8)) },
      { discard: 'm1', waits: waits(legal('m3', 12)) },
    ];
    expect(
      sortDiscardCandidates(candidates, 'highest-score').map(({ discard }) => discard),
    ).toEqual(['m1', 'm3', 'm2']);
    expect(sortDiscardCandidates(candidates, 'wait-count').map(({ discard }) => discard)).toEqual([
      'm2',
      'm1',
      'm3',
    ]);
  });
});
