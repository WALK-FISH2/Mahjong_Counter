import type { EngineWorkerRequest } from '../../application/engine-worker/engine-worker-protocol';
import { compareTileCodes } from '../../domain/mahjong/tile';

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

export function createEngineCacheKey(request: EngineWorkerRequest): string {
  const hand = request.document.hand;
  const normalizedHand = {
    concealed: [...hand.concealed].sort(compareTileCodes),
    melds: [...hand.melds]
      .map((meld) => stableValue(meld))
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    flowers: [...hand.flowers].sort(compareTileCodes),
    winningTile: hand.winningTile,
  };
  return JSON.stringify(
    stableValue({
      operation: request.operation,
      engineVersion: request.engineVersion,
      ruleId: request.rule.manifest.ruleId,
      ruleVersion: request.rule.manifest.ruleVersion,
      ruleContentHash: request.rule.manifest.contentHash,
      effectiveRule: request.rule,
      temporaryRuleAdjustment: request.document.temporaryRuleAdjustment,
      normalizedHand,
      context: request.document.context,
    }),
  );
}
