import { describe, expect, it } from 'vitest';

import { compareCandidateResults, type CandidateResult } from './candidate-comparison';

function candidate(
  candidateId: string,
  score: number,
  status: 'legal' | 'illegal',
): CandidateResult {
  return {
    candidateId,
    placed: {
      decomposition: {
        structureKey: 'standard-meld-pair',
        concealedMelds: [],
        pair: { kind: 'pair', tile: 'm1' },
        declaredMelds: [],
      },
      winningTilePlacement: { kind: 'pair', tile: 'm1' },
    },
    recognition: { candidates: [], unsupportedPatterns: [] },
    relation: { counted: [], excluded: [], all: [] },
    score: {
      strategyKey: 'scoring.additive',
      unit: 'fan',
      base: { strategyKey: 'scoring.additive', unit: 'fan', total: score, items: [] },
      extrasBeforeCap: [],
      extrasAfterCap: [],
      totalBeforeCap: score,
      cap: { enabled: false, value: null, applied: false, subtotalAfterCap: score },
      total: score,
    },
    legality:
      status === 'legal'
        ? { status: 'legal' }
        : {
            status: 'illegal',
            reasons: [
              {
                reasonCode: 'MINIMUM_FAN_NOT_MET',
                data: { actualFan: score, minimumFan: score + 1 },
              },
            ],
          },
    explanation: {
      ruleRef: { ruleId: 'fixture', ruleVersion: '1.0.0' },
      structure: { nodeType: 'structure', reasonCode: 'fixture', data: {} },
      patternNodes: [],
      relationNodes: [],
      scoringNodes: [],
      legalityNodes: [],
      sourceRefs: [],
    },
  };
}

describe('Candidate Comparison', () => {
  it('selects only the highest legal candidates and retains deterministic ties', () => {
    const result = compareCandidateResults([
      candidate('solution-b', 12, 'legal'),
      candidate('solution-illegal', 88, 'illegal'),
      candidate('solution-a', 12, 'legal'),
      candidate('solution-low', 8, 'legal'),
    ]);

    expect(result.orderedCandidates.map(({ candidateId }) => candidateId)).toEqual([
      'solution-a',
      'solution-b',
      'solution-illegal',
      'solution-low',
    ]);
    expect(result.highestLegalCandidateIds).toEqual(['solution-a', 'solution-b']);
    expect(result.selectedCandidateId).toBe('solution-a');
    expect(result.orderedCandidates.every(({ score }) => score.base.total === score.total)).toBe(
      true,
    );
  });

  it('returns no selection when every candidate is illegal', () => {
    expect(compareCandidateResults([candidate('only', 7, 'illegal')])).toMatchObject({
      highestLegalCandidateIds: [],
      selectedCandidateId: null,
    });
  });
});
