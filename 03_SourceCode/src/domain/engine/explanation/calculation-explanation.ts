import type { RuleRef } from '../../mahjong/calculator-document';
import type { RuleDataObject } from '../../rules/rule-data';
import type { RulePackageDefinition } from '../../rules/rule-package';
import type { PatternRecognitionResult } from '../pattern/pattern-recognizer';
import type { PatternRelationResolutionResult } from '../relation/pattern-relation-resolver';
import type { ScoreBreakdown } from '../scoring/cap-and-extras';
import {
  getWinningDecompositionKey,
  type WinningDecomposition,
} from '../structure/structure-engine';
import type { WinningTilePlacement } from '../structure/winning-tile-placement';
import type { LegalityResult } from '../legality/legality-engine';

export type ExplanationNode = Readonly<{
  nodeType: string;
  reasonCode: string;
  data: RuleDataObject;
}>;

export type CalculationExplanation = Readonly<{
  ruleRef: RuleRef;
  structure: ExplanationNode;
  patternNodes: readonly ExplanationNode[];
  relationNodes: readonly ExplanationNode[];
  scoringNodes: readonly ExplanationNode[];
  legalityNodes: readonly ExplanationNode[];
  sourceRefs: readonly string[];
}>;

function node(nodeType: string, reasonCode: string, data: RuleDataObject): ExplanationNode {
  return Object.freeze({ nodeType, reasonCode, data: Object.freeze({ ...data }) });
}

function placementKind(placement: WinningTilePlacement): string {
  return placement.kind;
}

export function createCalculationExplanation(
  input: Readonly<{
    rule: RulePackageDefinition;
    decomposition: WinningDecomposition;
    winningTilePlacement: WinningTilePlacement;
    recognition: PatternRecognitionResult;
    relation: PatternRelationResolutionResult;
    score: ScoreBreakdown;
    legality: LegalityResult;
  }>,
): CalculationExplanation {
  const patternsById = new Map(input.rule.patterns.map((pattern) => [pattern.patternId, pattern]));
  const patternNodes = input.recognition.candidates.flatMap((candidate) => {
    const definition = patternsById.get(candidate.patternId);
    return candidate.evidence.map((item) =>
      node('pattern', item.evidenceType, {
        patternId: candidate.patternId,
        occurrences: candidate.occurrences,
        value: typeof definition?.value === 'number' ? definition.value : null,
        evidence: item.facts,
      }),
    );
  });
  const relationNodes = input.relation.all.map((resolved) =>
    node('relation', resolved.reason, {
      patternId: resolved.candidate.patternId,
      status: resolved.status,
      excludedByPatternId: resolved.excludedByPatternId ?? null,
      relationType: resolved.relationType ?? null,
    }),
  );
  const scoringNodes: ExplanationNode[] = [
    ...input.score.base.items.map((item) =>
      node('scoring-pattern', 'PATTERN_SUBTOTAL', {
        patternId: item.patternId,
        occurrences: item.occurrences,
        unitValue: item.unitValue,
        subtotal: item.subtotal,
      }),
    ),
    ...[...input.score.extrasBeforeCap, ...input.score.extrasAfterCap].map((item) =>
      node('scoring-extra', 'EXTRA_SUBTOTAL', {
        extraId: item.extraId,
        patternId: item.patternId,
        occurrences: item.occurrences,
        unitValue: item.unitValue,
        subtotal: item.subtotal,
        capPlacement: item.capPlacement,
      }),
    ),
    node('scoring-cap', input.score.cap.applied ? 'CAP_APPLIED' : 'CAP_NOT_APPLIED', {
      enabled: input.score.cap.enabled,
      value: input.score.cap.value,
      totalBeforeCap: input.score.totalBeforeCap,
      subtotalAfterCap: input.score.cap.subtotalAfterCap,
      finalTotal: input.score.total,
    }),
  ];
  const legalityNodes =
    input.legality.status === 'legal'
      ? [node('legality', 'LEGAL', { minimumFan: input.rule.legality.minimumFan })]
      : input.legality.status === 'incomplete-context'
        ? input.legality.missingContextIds.map((contextId) =>
            node('legality', 'MISSING_REQUIRED_CONTEXT', { contextId }),
          )
        : input.legality.reasons.map((reason) =>
            node('legality', reason.reasonCode, {
              actualFan: reason.data.actualFan,
              minimumFan: reason.data.minimumFan,
            }),
          );
  const sourceRefs = new Set<string>();
  input.recognition.candidates.forEach(({ patternId }) => {
    patternsById.get(patternId)?.sourceRefs.forEach((sourceRef) => sourceRefs.add(sourceRef));
  });

  return Object.freeze({
    ruleRef: Object.freeze({
      ruleId: input.rule.manifest.ruleId,
      ruleVersion: input.rule.manifest.ruleVersion,
    }),
    structure: node('structure', 'WINNING_DECOMPOSITION', {
      structureKey: input.decomposition.structureKey,
      decompositionKey: getWinningDecompositionKey(input.decomposition),
      winningTilePlacement: placementKind(input.winningTilePlacement),
    }),
    patternNodes: Object.freeze(patternNodes),
    relationNodes: Object.freeze(relationNodes),
    scoringNodes: Object.freeze(scoringNodes),
    legalityNodes: Object.freeze(legalityNodes),
    sourceRefs: Object.freeze([...sourceRefs].sort()),
  });
}
