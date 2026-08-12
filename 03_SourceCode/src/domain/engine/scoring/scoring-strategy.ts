import type { PatternDefinition } from '../../rules/pattern-definition';
import type { ScoringDefinition } from '../../rules/scoring-definition';
import type { ResolvedPattern } from '../relation/pattern-relation-resolver';

export type ScoredPattern = Readonly<{
  patternId: string;
  occurrences: number;
  unitValue: number;
  subtotal: number;
  unit: string;
}>;

export type BaseScore = Readonly<{
  strategyKey: string;
  unit: string;
  total: number;
  items: readonly ScoredPattern[];
}>;

export type ScoringStrategy = Readonly<{
  strategyKey: string;
  score: (
    scoring: ScoringDefinition,
    patterns: readonly PatternDefinition[],
    counted: readonly ResolvedPattern[],
  ) => BaseScore;
}>;

export type ScoringStrategyRegistry = Readonly<{
  strategies: readonly ScoringStrategy[];
}>;

export class ScoringStrategyUnavailableError extends Error {
  constructor(readonly strategyKey: string) {
    super(`Scoring strategy is unavailable: ${strategyKey}`);
    this.name = 'ScoringStrategyUnavailableError';
  }
}

export function createScoringStrategyRegistry(
  strategies: readonly ScoringStrategy[],
): ScoringStrategyRegistry {
  const seen = new Set<string>();
  const copied = strategies.map((strategy) => {
    if (seen.has(strategy.strategyKey)) {
      throw new RangeError(`Duplicate scoring strategy key: ${strategy.strategyKey}`);
    }
    seen.add(strategy.strategyKey);
    return Object.freeze({ ...strategy });
  });
  return Object.freeze({ strategies: Object.freeze(copied) });
}

export const additiveScoringStrategy: ScoringStrategy = Object.freeze({
  strategyKey: 'scoring.additive',
  score: (scoring, patterns, counted) => {
    const definitions = new Map(patterns.map((pattern) => [pattern.patternId, pattern]));
    const extraPatternIds = new Set(
      scoring.extras?.flatMap(({ parameters }) => {
        const patternId = parameters.patternId;
        return typeof patternId === 'string' ? [patternId] : [];
      }) ?? [],
    );
    const items = counted
      .filter(({ candidate }) => !extraPatternIds.has(candidate.patternId))
      .map(({ candidate }) => {
        const definition = definitions.get(candidate.patternId);
        if (definition === undefined) {
          throw new RangeError(`Missing PatternDefinition for ${candidate.patternId}`);
        }
        if (definition.unit !== scoring.unit || typeof definition.value !== 'number') {
          throw new TypeError(
            `Pattern ${candidate.patternId} is incompatible with ${scoring.strategyKey}.`,
          );
        }
        return Object.freeze({
          patternId: candidate.patternId,
          occurrences: candidate.occurrences,
          unitValue: definition.value,
          subtotal: definition.value * candidate.occurrences,
          unit: definition.unit,
        });
      });
    return Object.freeze({
      strategyKey: scoring.strategyKey,
      unit: scoring.unit,
      total: items.reduce((total, item) => total + item.subtotal, 0),
      items: Object.freeze(items),
    });
  },
});

export function scoreResolvedPatterns(
  scoring: ScoringDefinition,
  patterns: readonly PatternDefinition[],
  counted: readonly ResolvedPattern[],
  registry: ScoringStrategyRegistry,
): BaseScore {
  const strategy = registry.strategies.find(
    ({ strategyKey }) => strategyKey === scoring.strategyKey,
  );
  if (strategy === undefined) {
    throw new ScoringStrategyUnavailableError(scoring.strategyKey);
  }
  return strategy.score(scoring, patterns, counted);
}
