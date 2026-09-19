import {
  createCalculatorDocument,
  type CalculatorDocument,
} from '../../domain/mahjong/calculator-document';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import { buildEffectiveRule } from '../../domain/rules/effective-rule';
import type { SystemEvaluation } from '../../domain/engine/evaluation';
import type { CalculatorState } from '../calculator/calculator-store';
import { parsePersistedCalculatorState } from '../../schemas/persistence/calculator-state-schema';
import { savedResultSchema } from '../../schemas/persistence/saved-result-schema';
import type {
  PersistedCalculatorState,
  ResultDisplaySnapshot,
  SavedResultSnapshot,
  SerializableEvaluation,
} from './persistence-models';

export function persistCalculator(document: CalculatorDocument): PersistedCalculatorState {
  return parsePersistedCalculatorState(document);
}
export function restoreCalculator(dto: PersistedCalculatorState): CalculatorDocument {
  return createCalculatorDocument(dto);
}
export function restoreEvaluation(dto: SerializableEvaluation): SystemEvaluation {
  // A fresh, validated DTO is mapped structurally. No engine invocation or legacy rule execution.
  if (dto.status === 'not-winning') return { ...dto, status: 'not-winning' };
  if (dto.status === 'legal-win') return { ...dto, status: 'legal-win' };
  if (dto.status === 'incomplete-context') return { ...dto, status: 'incomplete-context' };
  return { ...dto, status: 'structural-win-but-illegal' };
}
function displaySnapshot(rule: RulePackageDefinition): ResultDisplaySnapshot {
  return {
    patterns: rule.patterns.map(({ patternId, name, value }) => ({ patternId, name, value })),
    scoring: { unit: rule.scoring.unit },
    sources: rule.sources.map(({ sourceId, title, url }) => ({
      sourceId,
      title,
      ...(url === undefined ? {} : { url }),
    })),
  };
}
export function captureResultSnapshot(
  state: CalculatorState,
  engineVersion: string,
): SavedResultSnapshot {
  const layered = state.layeredEvaluation;
  if (layered === null) throw new Error('No completed evaluation');
  const effective = buildEffectiveRule(state.rulePackage, state.document.temporaryRuleAdjustment);
  return savedResultSchema.parse({
    documentRevision: state.document.revision,
    presetResult: layered.preset,
    ...(layered.sessionRule === undefined
      ? {}
      : { sessionRuleResult: layered.sessionRule.evaluation }),
    ...(layered.userAdjustment === undefined ? {} : { userAdjustedResult: layered.userAdjustment }),
    highestCandidateIds: (layered.sessionRule?.evaluation ?? layered.preset)
      .highestLegalCandidateIds,
    lastViewedCandidateId: state.selectedAnalysisCandidateId,
    lastViewedLayer:
      state.activeEvaluationLayer === 'user-adjustment'
        ? 'user-adjusted'
        : state.activeEvaluationLayer,
    ruleRef: state.document.ruleRef,
    engineVersion,
    display: {
      ruleName: state.rulePackage.manifest.displayName,
      ruleStatus: state.rulePackage.manifest.status,
      ruleContentHash: state.rulePackage.manifest.contentHash,
      contextLabels: state.rulePackage.contexts.map(({ contextId, labelKey, options }) => ({
        contextId,
        labelKey,
        options: options ?? [],
      })),
      adjustmentLabels: state.rulePackage.temporaryAdjustments.map(({ adjustmentId, target }) => {
        if (target.module === 'legality')
          return { adjustmentId, labelKey: 'adjustment.minimumFan' };
        if (target.module === 'scoring-cap')
          return {
            adjustmentId,
            labelKey: target.field === 'enabled' ? 'adjustment.capEnabled' : 'adjustment.capValue',
          };
        const patternId =
          target.module === 'pattern'
            ? target.patternId
            : state.rulePackage.scoring.extras?.find((extra) => extra.extraId === target.extraId)
                ?.parameters.patternId;
        const name =
          state.rulePackage.patterns.find((pattern) => pattern.patternId === patternId)?.name ??
          adjustmentId;
        return { adjustmentId, labelKey: `${name} · ${target.field}` };
      }),
      warnings: state.rulePackage.encyclopedia.knownLimitations.flatMap((block) =>
        block.type === 'paragraph' ? [block.text] : block.items,
      ),
      preset: displaySnapshot(state.rulePackage),
      ...(layered.sessionRule === undefined ? {} : { sessionRule: displaySnapshot(effective) }),
    },
  });
}
