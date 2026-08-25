import { describe, expect, it } from 'vitest';

import { COMMON_SIMPLE_STRUCTURE_RULE_CASES } from '../../content/rules/common-simple/structure-rule-cases';
import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import { commonSimplePatternRecognizerRegistry } from '../../content/rules/common-simple/pattern-recognizers';
import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../content/rules/common-simple/scoring-capabilities';
import { evaluateHand } from '../../domain/engine/evaluation';
import { createHandSnapshot } from '../../domain/mahjong';
import {
  createCalculatorStore,
  createInitialCalculatorDocument,
} from '../calculator/calculator-store';
import {
  InMemoryCalculatorDraftPort,
  createCalculatorReplaceGuard,
} from '../calculator/replace-calculator';
import {
  canBringEncyclopediaExampleIntoCalculator,
  createEncyclopediaExampleReplacement,
  listEncyclopediaExamples,
} from './encyclopedia-examples';

describe('T807/T808 encyclopedia Rule Case examples', () => {
  it('keeps development examples view-only while test/full examples may enter Calculator', () => {
    expect(canBringEncyclopediaExampleIntoCalculator({ status: 'development' })).toBe(false);
    expect(canBringEncyclopediaExampleIntoCalculator({ status: 'test' })).toBe(true);
    expect(canBringEncyclopediaExampleIntoCalculator({ status: 'full' })).toBe(true);
  });

  it('resolves every example from the shared passed Rule Case source', () => {
    const examples = listEncyclopediaExamples(
      commonSimpleRulePackage,
      COMMON_SIMPLE_STRUCTURE_RULE_CASES,
    );

    expect(examples.map(({ definition }) => definition.category)).toEqual([
      'basic',
      'combination',
      'combination',
      'counterexample',
      'local-special',
    ]);
    expect(examples[0]?.definition.ruleCaseId).toBe('structure-standard-positive');
    expect(examples[0]?.ruleCase.expected).toEqual({
      status: 'STRUCTURAL_WIN',
      structureKeys: ['standard-meld-pair'],
      minimumDecompositionCount: 1,
      minimumWinningTilePlacementCount: 1,
    });
    for (const example of examples) {
      expect(example.ruleCase.calculator.context?.values).toMatchObject({
        seatWind: { status: 'known', value: 'east' },
        roundWind: { status: 'known', value: 'south' },
      });
    }
  });

  it('keeps the relation example expectation aligned with the real M4 evaluation', () => {
    const example = listEncyclopediaExamples(
      commonSimpleRulePackage,
      COMMON_SIMPLE_STRUCTURE_RULE_CASES,
    ).find(({ definition }) => definition.exampleId === 'combination-covered-patterns')!;
    const result = evaluateHand({
      hand: createHandSnapshot(example.ruleCase.calculator.hand),
      context: example.ruleCase.calculator.context!,
      rule: commonSimpleRulePackage,
      patternRecognizers: commonSimplePatternRecognizerRegistry,
      scoringStrategies: commonSimpleScoringStrategyRegistry,
      extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
    });
    const candidate = result.candidates.find(
      ({ candidateId }) => candidateId === result.selectedCandidateId,
    )!;

    expect(candidate.relation.counted.map(({ candidate: item }) => item.patternId)).toEqual(
      expect.arrayContaining([...(example.ruleCase.expected.countedPatternIds ?? [])]),
    );
    expect(candidate.relation.excluded.map(({ candidate: item }) => item.patternId)).toEqual(
      expect.arrayContaining([...(example.ruleCase.expected.excludedPatternIds ?? [])]),
    );
  });

  it('uses Calculator Replace Guard and never overwrites a cancelled draft', async () => {
    const store = createCalculatorStore(commonSimpleRulePackage);
    const draftPort = new InMemoryCalculatorDraftPort();
    const guard = createCalculatorReplaceGuard(store, draftPort);
    const example = listEncyclopediaExamples(
      commonSimpleRulePackage,
      COMMON_SIMPLE_STRUCTURE_RULE_CASES,
    )[0]!;
    const original = store.getState().document;
    const replacement = () =>
      createEncyclopediaExampleReplacement(
        store.getState().document,
        commonSimpleRulePackage,
        example,
      );

    await expect(
      guard.prepareToReplaceCalculator('encyclopedia-example', () => false, replacement),
    ).resolves.toEqual({ status: 'cancelled' });
    expect(store.getState().document).toBe(original);

    await expect(
      guard.prepareToReplaceCalculator('encyclopedia-example', () => true, replacement),
    ).resolves.toEqual({ status: 'replaced' });
    expect(store.getState().document.source).toEqual({
      kind: 'encyclopedia-example',
      exampleId: 'basic-standard-hand',
    });
    expect(store.getState().document.hand).toMatchObject(example.ruleCase.calculator.hand);
    expect(store.getState().document).not.toEqual(
      createInitialCalculatorDocument(commonSimpleRulePackage),
    );
  });
});
