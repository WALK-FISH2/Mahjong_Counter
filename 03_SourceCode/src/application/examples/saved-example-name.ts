import type { CalculatorState } from '../calculator/calculator-store';
import { buildEffectiveRule } from '../../domain/rules/effective-rule';

// Presentation naming policy for trusted recognizer capabilities, never a ruleId branch.
const ORDINARY_NAME_CAPABILITIES = new Set([
  'recognizer.concealedHand',
  'recognizer.selfDrawn',
  'recognizer.flowerTiles',
]);

export function defaultExampleName(state: CalculatorState): string {
  const actual =
    state.layeredEvaluation?.sessionRule?.evaluation ?? state.layeredEvaluation?.preset;
  const candidate = actual?.candidates.find(
    (item) => item.candidateId === actual.highestLegalCandidateIds[0],
  );
  const rule = buildEffectiveRule(state.rulePackage, state.document.temporaryRuleAdjustment);
  const extraIds = new Set(rule.scoring.extras?.map((extra) => extra.parameters.patternId));
  const names = [...(candidate?.score.base.items ?? [])]
    .filter((item) => !extraIds.has(item.patternId))
    .sort(
      (a, b) =>
        b.subtotal - a.subtotal ||
        (a.patternId < b.patternId ? -1 : a.patternId > b.patternId ? 1 : 0),
    )
    .flatMap((item) => {
      const definition = rule.patterns.find((pattern) => pattern.patternId === item.patternId);
      return definition === undefined || ORDINARY_NAME_CAPABILITIES.has(definition.recognizerKey)
        ? []
        : [definition.name];
    })
    .slice(0, 2);
  return `${rule.manifest.displayName} ${names.length === 0 ? '普通和牌' : names.join('、')}`;
}
