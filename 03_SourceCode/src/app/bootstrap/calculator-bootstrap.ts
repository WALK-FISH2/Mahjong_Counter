import {
  createCalculatorStore,
  type CalculatorStore,
} from '../../application/calculator/calculator-store';
import {
  COMMON_SIMPLE_RULE_REF,
  createCommonSimpleRuleRepository,
} from '../../infrastructure/rule-repository/common-simple-rule-repository';

let calculatorStorePromise: Promise<CalculatorStore> | undefined;

export function loadCalculatorStore(): Promise<CalculatorStore> {
  calculatorStorePromise ??= createCommonSimpleRuleRepository()
    .getInstalledRule(COMMON_SIMPLE_RULE_REF)
    .then((rulePackage) => createCalculatorStore(rulePackage));

  return calculatorStorePromise;
}
