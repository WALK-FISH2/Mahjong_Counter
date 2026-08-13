import { createHandSnapshot, type HandSnapshot } from '../../mahjong/hand';
import { countHandStructure } from '../../mahjong/hand-count';
import type { WinContext } from '../../mahjong/context';
import type { TileCode } from '../../mahjong/tile';
import { validateHandSnapshot } from '../../mahjong/validation';
import type { RulePackageDefinition } from '../../rules/rule-package';
import {
  analyzeWaits,
  type ReadyAnalysisCapabilities,
  type WaitAnalysisResult,
} from './wait-analysis';

export type DiscardToReadyInput = Readonly<{
  hand: HandSnapshot;
  context: WinContext;
  rule: RulePackageDefinition;
  capabilities: ReadyAnalysisCapabilities;
}>;

export type DiscardToReadyCandidate = Readonly<{
  discard: TileCode;
  waits: WaitAnalysisResult;
}>;

export type DiscardToReadyResult = Readonly<{
  candidates: readonly DiscardToReadyCandidate[];
}>;

export type DiscardToReadyInputIssue =
  'WINNING_TILE_MUST_BE_EMPTY' | 'TARGET_STRUCTURAL_TILE_COUNT_REQUIRED' | 'HAND_VALIDATION_FAILED';

export class DiscardToReadyInputError extends Error {
  readonly issue: DiscardToReadyInputIssue;

  constructor(issue: DiscardToReadyInputIssue) {
    super(`Discard-to-ready input is invalid: ${issue}.`);
    this.name = 'DiscardToReadyInputError';
    this.issue = issue;
  }
}

export function analyzeDiscardToReady(input: DiscardToReadyInput): DiscardToReadyResult {
  if (input.hand.winningTile !== null) {
    throw new DiscardToReadyInputError('WINNING_TILE_MUST_BE_EMPTY');
  }
  if (
    countHandStructure(input.hand).structuralTileCount !==
    input.rule.handModel.targetStructuralTileCount
  ) {
    throw new DiscardToReadyInputError('TARGET_STRUCTURAL_TILE_COUNT_REQUIRED');
  }
  if (!validateHandSnapshot(input.hand, input.rule.tileSet).isValid) {
    throw new DiscardToReadyInputError('HAND_VALIDATION_FAILED');
  }

  const seen = new Set<TileCode>();
  const candidates: DiscardToReadyCandidate[] = [];

  input.hand.concealed.forEach((discard, concealedIndex) => {
    if (seen.has(discard)) return;
    seen.add(discard);

    const nextHand = createHandSnapshot({
      ...input.hand,
      concealed: input.hand.concealed.filter((_, index) => index !== concealedIndex),
    });
    const waits = analyzeWaits({ ...input, hand: nextHand });
    if (waits.legalWaitCount === 0) return;

    candidates.push(Object.freeze({ discard, waits }));
  });

  return Object.freeze({ candidates: Object.freeze(candidates) });
}
