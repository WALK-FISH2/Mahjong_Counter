import type { PatternDefinition } from '../../rules/pattern-definition';
import type { PatternRelationDefinition } from '../../rules/pattern-relation';
import type { PatternCandidate } from '../pattern/pattern-recognizer';

export type PatternResolutionReason =
  | 'COUNTED'
  | 'COVERED'
  | 'MUTEX'
  | 'NON_REPEAT'
  | 'HIGHER_SELECTED'
  | 'SAME_SET_ALREADY_USED'
  | 'FALLBACK_NOT_APPLICABLE';

export type ResolvedPattern = Readonly<{
  candidate: PatternCandidate;
  status: 'COUNTED' | 'EXCLUDED';
  reason: PatternResolutionReason;
  excludedByPatternId?: string;
  relationType?: PatternRelationDefinition['type'];
}>;

export type PatternRelationResolutionResult = Readonly<{
  counted: readonly ResolvedPattern[];
  excluded: readonly ResolvedPattern[];
  all: readonly ResolvedPattern[];
}>;

function numericValue(patterns: ReadonlyMap<string, PatternDefinition>, patternId: string): number {
  const value = patterns.get(patternId)?.value;
  return typeof value === 'number' ? value : Number.NEGATIVE_INFINITY;
}

function selectWinner(
  candidates: readonly PatternCandidate[],
  relation: Exclude<PatternRelationDefinition, { type: 'covers' }>,
  patterns: ReadonlyMap<string, PatternDefinition>,
): PatternCandidate {
  if (relation.resolution === 'explicit-priority' && relation.priority !== undefined) {
    for (const patternId of relation.priority) {
      const candidate = candidates.find((item) => item.patternId === patternId);
      if (candidate !== undefined) return candidate;
    }
  }

  return [...candidates].sort((left, right) => {
    const valueDifference =
      numericValue(patterns, right.patternId) - numericValue(patterns, left.patternId);
    return valueDifference !== 0 ? valueDifference : left.patternId.localeCompare(right.patternId);
  })[0]!;
}

function exclusion(
  candidate: PatternCandidate,
  reason: PatternResolutionReason,
  excludedByPatternId: string,
  relationType: PatternRelationDefinition['type'],
): ResolvedPattern {
  return Object.freeze({
    candidate,
    status: 'EXCLUDED',
    reason,
    excludedByPatternId,
    relationType,
  });
}

export function resolvePatternRelations(
  candidates: readonly PatternCandidate[],
  definitions: readonly PatternDefinition[],
  relations: readonly PatternRelationDefinition[],
): PatternRelationResolutionResult {
  const definitionsById = new Map(
    definitions.map((definition) => [definition.patternId, definition]),
  );
  const candidatesById = new Map(candidates.map((candidate) => [candidate.patternId, candidate]));
  const excluded = new Map<string, ResolvedPattern>();

  const active = (patternId: string): PatternCandidate | undefined =>
    excluded.has(patternId) ? undefined : candidatesById.get(patternId);

  relations.forEach((relation) => {
    if (relation.type === 'covers') {
      const winner = candidatesById.get(relation.winner);
      const covered = active(relation.covered);
      if (winner !== undefined && covered !== undefined) {
        excluded.set(
          covered.patternId,
          exclusion(covered, 'COVERED', winner.patternId, relation.type),
        );
      }
      return;
    }

    const applicable = relation.patterns.flatMap((patternId) => {
      const candidate = active(patternId);
      return candidate === undefined ? [] : [candidate];
    });
    if (applicable.length < 2) return;

    const winner = selectWinner(applicable, relation, definitionsById);
    applicable.forEach((candidate) => {
      if (candidate.patternId === winner.patternId) return;
      excluded.set(
        candidate.patternId,
        exclusion(
          candidate,
          relation.type === 'mutually-exclusive'
            ? relation.resolution === 'highest-value'
              ? 'HIGHER_SELECTED'
              : 'MUTEX'
            : relation.resolution === 'highest-value'
              ? 'HIGHER_SELECTED'
              : 'NON_REPEAT',
          winner.patternId,
          relation.type,
        ),
      );
    });
  });

  const fallbackCandidates = candidates.filter(({ evidence: candidateEvidence }) =>
    candidateEvidence.some(({ evidenceType }) => evidenceType === 'fallback-if-no-other'),
  );
  const substantiveCounted = candidates.filter(
    ({ patternId, evidence: candidateEvidence }) =>
      !excluded.has(patternId) &&
      !fallbackCandidates.some((fallback) => fallback.patternId === patternId) &&
      !candidateEvidence.every(({ evidenceType }) => evidenceType === 'fallback-ignored-extra'),
  );
  fallbackCandidates.forEach((fallback) => {
    if (!excluded.has(fallback.patternId) && substantiveCounted.length > 0) {
      excluded.set(
        fallback.patternId,
        exclusion(
          fallback,
          'FALLBACK_NOT_APPLICABLE',
          substantiveCounted[0]!.patternId,
          'mutually-exclusive',
        ),
      );
    }
  });

  const all = Object.freeze(
    candidates.map(
      (candidate): ResolvedPattern =>
        excluded.get(candidate.patternId) ??
        Object.freeze({ candidate, status: 'COUNTED', reason: 'COUNTED' }),
    ),
  );
  return Object.freeze({
    counted: Object.freeze(all.filter(({ status }) => status === 'COUNTED')),
    excluded: Object.freeze(all.filter(({ status }) => status === 'EXCLUDED')),
    all,
  });
}
