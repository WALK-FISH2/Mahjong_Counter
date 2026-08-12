import {
  COMMON_SIMPLE_CAPABILITY_DEFINITIONS,
  commonSimpleRulePackageInput,
} from '../../content/rules/common-simple/rule-package';
import { commonSimplePatternRecognizerRegistry } from '../../content/rules/common-simple/pattern-recognizers';
import { createCapabilityRegistry } from '../../domain/rules/capability-registry';
import { BuiltInRuleRepository } from './built-in-rule-repository';

export const COMMON_SIMPLE_RULE_REF = Object.freeze({
  ruleId: 'common-simple',
  ruleVersion: '1.0.0',
});

export const commonSimpleCapabilityRegistry = createCapabilityRegistry([
  ...COMMON_SIMPLE_CAPABILITY_DEFINITIONS.filter(({ kind }) => kind !== 'recognizer'),
  ...commonSimplePatternRecognizerRegistry.recognizers.map(({ recognizerKey }) => ({
    capabilityKey: recognizerKey,
    kind: 'recognizer' as const,
  })),
]);

export function createCommonSimpleRuleRepository(): BuiltInRuleRepository {
  return new BuiltInRuleRepository([
    {
      ref: COMMON_SIMPLE_RULE_REF,
      input: commonSimpleRulePackageInput,
      capabilities: commonSimpleCapabilityRegistry,
      patternRecognizers: commonSimplePatternRecognizerRegistry,
    },
  ]);
}
