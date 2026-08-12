import {
  createCalculatorStore,
  type CalculatorStore,
} from '../../application/calculator/calculator-store';
import { commonSimplePatternRecognizerRegistry } from '../../content/rules/common-simple/pattern-recognizers';
import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../content/rules/common-simple/scoring-capabilities';
import { evaluateHand } from '../../domain/engine/evaluation';
import {
  COMMON_SIMPLE_RULE_REF,
  createCommonSimpleRuleRepository,
} from '../../infrastructure/rule-repository/common-simple-rule-repository';

let calculatorStorePromise: Promise<CalculatorStore> | undefined;

export function loadCalculatorStore(): Promise<CalculatorStore> {
  calculatorStorePromise ??= createCommonSimpleRuleRepository()
    .getInstalledRule(COMMON_SIMPLE_RULE_REF)
    .then((rulePackage) =>
      createCalculatorStore(rulePackage, undefined, (document, rule) =>
        evaluateHand({
          hand: document.hand,
          context: document.context,
          rule,
          patternRecognizers: commonSimplePatternRecognizerRegistry,
          scoringStrategies: commonSimpleScoringStrategyRegistry,
          extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
        }),
      ),
    );

  return calculatorStorePromise;
}
