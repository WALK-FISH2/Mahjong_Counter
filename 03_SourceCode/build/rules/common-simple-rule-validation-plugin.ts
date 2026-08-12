import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

import { commonSimpleRuleCorpusIndexInput } from '../../src/content/rules/common-simple/rule-corpus-index';
import { commonSimpleRulePackageInput } from '../../src/content/rules/common-simple/rule-package';
import { commonSimplePatternRecognizerRegistry } from '../../src/content/rules/common-simple/pattern-recognizers';
import { COMMON_SIMPLE_VALIDATION_CONTRACT } from '../../src/content/rules/common-simple/validation-contract';
import { validateBuiltInRulePackage } from '../../src/infrastructure/rule-validation/build-time-rule-validator';
import { commonSimpleCapabilityRegistry } from '../../src/infrastructure/rule-repository/common-simple-rule-repository';

const RULE_SPEC_PATH = 'docs/rules/common-simple/rule-spec-v1.0.md';

export function commonSimpleRuleValidationPlugin(): Plugin {
  return {
    name: 'common-simple-rule-validation',
    apply: 'build',
    async buildStart() {
      const ruleSpecMarkdown = await readFile(resolve(process.cwd(), RULE_SPEC_PATH), 'utf8');
      const report = await validateBuiltInRulePackage({
        rulePackageInput: commonSimpleRulePackageInput,
        ruleCorpusInput: commonSimpleRuleCorpusIndexInput,
        capabilityRegistry: commonSimpleCapabilityRegistry,
        patternRecognizerRegistry: commonSimplePatternRecognizerRegistry,
        ruleSpecMarkdown,
        contract: COMMON_SIMPLE_VALIDATION_CONTRACT,
      });

      this.info(
        `Rule validation PASS: ${report.ruleId}@${report.ruleVersion} ` +
          `(${report.patternCount}/${report.enabledPatternCount}/${report.disabledPatternCount}, ` +
          `${report.sourceCount} sources)`,
      );
    },
  };
}
