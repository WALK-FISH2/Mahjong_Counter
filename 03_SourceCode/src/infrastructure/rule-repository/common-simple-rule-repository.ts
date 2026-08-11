import {
  COMMON_SIMPLE_CAPABILITY_DEFINITIONS,
  commonSimpleRulePackageInput,
} from '../../content/rules/common-simple/rule-package';
import { createCapabilityRegistry } from '../../domain/rules/capability-registry';
import { BuiltInRuleRepository } from './built-in-rule-repository';

export const COMMON_SIMPLE_RULE_REF = Object.freeze({
  ruleId: 'common-simple',
  ruleVersion: '1.0.0',
});

export const commonSimpleCapabilityRegistry = createCapabilityRegistry(
  COMMON_SIMPLE_CAPABILITY_DEFINITIONS,
);

export function createCommonSimpleRuleRepository(): BuiltInRuleRepository {
  return new BuiltInRuleRepository([
    {
      ref: COMMON_SIMPLE_RULE_REF,
      input: commonSimpleRulePackageInput,
      capabilities: commonSimpleCapabilityRegistry,
    },
  ]);
}
