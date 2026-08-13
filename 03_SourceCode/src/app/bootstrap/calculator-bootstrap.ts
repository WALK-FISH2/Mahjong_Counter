import {
  createCalculatorStore,
  type CalculatorStore,
} from '../../application/calculator/calculator-store';
import {
  InMemoryCalculatorDraftPort,
  createCalculatorReplaceGuard,
} from '../../application/calculator/replace-calculator';
import {
  InMemoryCalculatorPreferencesPort,
  recordRecentlyUsedRule,
} from '../../application/preferences';
import { commonSimplePatternRecognizerRegistry } from '../../content/rules/common-simple/pattern-recognizers';
import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../content/rules/common-simple/scoring-capabilities';
import {
  createQuickCalcEvaluator,
  type QuickCalcEvaluator,
} from '../../application/calculator/quick-calc';
import { evaluateHand } from '../../domain/engine/evaluation';
import {
  COMMON_SIMPLE_RULE_REF,
  createCommonSimpleRuleRepository,
} from '../../infrastructure/rule-repository/common-simple-rule-repository';
import type { BuiltInRuleRepository } from '../../infrastructure/rule-repository/built-in-rule-repository';

export type CalculatorRuntime = Readonly<{
  store: CalculatorStore;
  quickCalcEvaluator: QuickCalcEvaluator;
  ruleRepository: BuiltInRuleRepository;
  preferencesPort: InMemoryCalculatorPreferencesPort;
  replaceGuard: ReturnType<typeof createCalculatorReplaceGuard>;
}>;

let calculatorRuntimePromise: Promise<CalculatorRuntime> | undefined;
const preferencesPort = new InMemoryCalculatorPreferencesPort();
const draftPort = new InMemoryCalculatorDraftPort();

export function loadCalculatorRuntime(): Promise<CalculatorRuntime> {
  calculatorRuntimePromise ??= (async () => {
    const ruleRepository = createCommonSimpleRuleRepository();
    const rulePackage = await ruleRepository.getInstalledRule(COMMON_SIMPLE_RULE_REF);
    await recordRecentlyUsedRule(preferencesPort, rulePackage.manifest);
    const store = createCalculatorStore(
      rulePackage,
      undefined,
      (document, rule) =>
        evaluateHand({
          hand: document.hand,
          context: document.context,
          rule,
          patternRecognizers: commonSimplePatternRecognizerRegistry,
          scoringStrategies: commonSimpleScoringStrategyRegistry,
          extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
        }),
      {
        scoringStrategies: commonSimpleScoringStrategyRegistry,
        extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
      },
    );

    return Object.freeze({
      store,
      quickCalcEvaluator: createQuickCalcEvaluator({
        scoringStrategies: commonSimpleScoringStrategyRegistry,
        extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
      }),
      ruleRepository,
      preferencesPort,
      replaceGuard: createCalculatorReplaceGuard(store, draftPort),
    });
  })();

  return calculatorRuntimePromise;
}

export async function loadCalculatorStore(): Promise<CalculatorStore> {
  return (await loadCalculatorRuntime()).store;
}
