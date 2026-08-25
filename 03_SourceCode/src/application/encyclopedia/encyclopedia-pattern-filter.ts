import type { SystemEvaluation } from '../../domain/engine/evaluation';
import type { PatternDefinition } from '../../domain/rules/pattern-definition';

export type PatternEnabledFilter = 'all' | 'enabled' | 'disabled';

export type PatternEncyclopediaFilters = Readonly<{
  query: string;
  category: string;
  minimumValue: number | null;
  maximumValue: number | null;
  enabled: PatternEnabledFilter;
  currentRecognizedOnly: boolean;
}>;

export function getPatternCategory(pattern: PatternDefinition): string {
  return `${String(pattern.value)} ${pattern.unit}`;
}

export function getRecognizedPatternIds(evaluation: SystemEvaluation | null): ReadonlySet<string> {
  if (evaluation === null) return new Set<string>();

  return new Set(
    evaluation.candidates.flatMap(({ relation }) =>
      relation.all.map(({ candidate }) => candidate.patternId),
    ),
  );
}

export function filterEncyclopediaPatterns(
  patterns: readonly PatternDefinition[],
  filters: PatternEncyclopediaFilters,
  currentPatternIds: ReadonlySet<string>,
): readonly PatternDefinition[] {
  const query = filters.query.trim().toLocaleLowerCase('zh-CN');

  return patterns.filter((pattern) => {
    const numericValue = typeof pattern.value === 'number' ? pattern.value : null;
    const searchable = [pattern.name, ...(pattern.aliases ?? [])]
      .join('\n')
      .toLocaleLowerCase('zh-CN');

    return (
      (query.length === 0 || searchable.includes(query)) &&
      (filters.category.length === 0 || getPatternCategory(pattern) === filters.category) &&
      (filters.minimumValue === null ||
        (numericValue !== null && numericValue >= filters.minimumValue)) &&
      (filters.maximumValue === null ||
        (numericValue !== null && numericValue <= filters.maximumValue)) &&
      (filters.enabled === 'all' || pattern.enabled === (filters.enabled === 'enabled')) &&
      (!filters.currentRecognizedOnly || currentPatternIds.has(pattern.patternId))
    );
  });
}
