import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { commonSimpleRuleCorpusIndexInput } from '../../content/rules/common-simple/rule-corpus-index';
import { commonSimpleRulePackageInput } from '../../content/rules/common-simple/rule-package';
import { commonSimplePatternRecognizerRegistry } from '../../content/rules/common-simple/pattern-recognizers';
import { COMMON_SIMPLE_VALIDATION_CONTRACT } from '../../content/rules/common-simple/validation-contract';
import type { CapabilityRegistry } from '../../domain/rules/capability-registry';
import { calculateRulePackageContentHash } from '../content-integrity/rule-content-hash';
import {
  COMMON_SIMPLE_RULE_REF,
  commonSimpleCapabilityRegistry,
} from '../rule-repository/common-simple-rule-repository';
import { parseRulePackageDefinition } from '../../schemas/rule-package/rule-package-definition-schema';
import {
  BuildTimeRuleValidationError,
  validateBuiltInRulePackage,
} from './build-time-rule-validator';

type MutablePatternFixture = {
  patternId: string;
  enabled: boolean;
  sourceRefs: string[];
};

type MutableRulePackageFixture = {
  manifest: { ruleId: string; ruleVersion: string; contentHash: string };
  handModel: {
    openKongPolicy: {
      distinction: string;
      allowedKinds: string[];
    };
  };
  patterns: MutablePatternFixture[];
  temporaryAdjustments: Array<{
    target: { module: string; patternId?: string };
  }>;
  relations: Array<{ type: string; winner?: string; covered?: string }>;
  sources: Array<{ sourceId: string }>;
  encyclopedia: {
    patternArticles: Array<{ patternId: string }>;
    sourceArticles: Array<{ sourceId: string }>;
  };
};

const ruleSpecMarkdown = readFileSync('docs/rules/common-simple/rule-spec-v1.0.md', 'utf8');

function cloneRulePackage(): MutableRulePackageFixture {
  return structuredClone(commonSimpleRulePackageInput) as MutableRulePackageFixture;
}

async function updateFixtureHash(fixture: MutableRulePackageFixture): Promise<void> {
  const parsed = parseRulePackageDefinition(fixture);
  fixture.manifest.contentHash = await calculateRulePackageContentHash(parsed);
}

async function validateFixture(
  overrides: Readonly<{
    rulePackageInput?: unknown;
    ruleCorpusInput?: unknown;
    capabilityRegistry?: CapabilityRegistry;
    ruleSpec?: string;
  }> = {},
) {
  return validateBuiltInRulePackage({
    rulePackageInput: overrides.rulePackageInput ?? commonSimpleRulePackageInput,
    ruleCorpusInput: overrides.ruleCorpusInput ?? commonSimpleRuleCorpusIndexInput,
    capabilityRegistry: overrides.capabilityRegistry ?? commonSimpleCapabilityRegistry,
    patternRecognizerRegistry: commonSimplePatternRecognizerRegistry,
    ruleSpecMarkdown: overrides.ruleSpec ?? ruleSpecMarkdown,
    contract: COMMON_SIMPLE_VALIDATION_CONTRACT,
  });
}

async function expectBlocked(
  action: Promise<unknown>,
  issueCode: string,
  packageIssueCode?: string,
): Promise<void> {
  try {
    await action;
    throw new Error('Expected build-time validation to fail.');
  } catch (error) {
    expect(error).toBeInstanceOf(BuildTimeRuleValidationError);
    const validationError = error as BuildTimeRuleValidationError;
    expect(validationError.issues.map(({ code }) => code)).toContain(issueCode);
    if (packageIssueCode !== undefined) {
      expect(validationError.issues[0]?.message).toContain(packageIssueCode);
    }
  }
}

describe('Build-time Rule Validator', () => {
  it('accepts the frozen RulePackage, Rule Spec, capability registry, and corpus identity', async () => {
    await expect(validateFixture()).resolves.toEqual({
      ...COMMON_SIMPLE_RULE_REF,
      patternCount: 81,
      enabledPatternCount: 78,
      disabledPatternCount: 3,
      sourceCount: 6,
    });
  });

  it('blocks duplicate Pattern IDs and invalid relation/source references', async () => {
    const duplicateId = cloneRulePackage();
    duplicateId.patterns[1]!.patternId = duplicateId.patterns[0]!.patternId;
    await expectBlocked(validateFixture({ rulePackageInput: duplicateId }), 'RULE_PACKAGE_INVALID');

    const invalidRelation = cloneRulePackage();
    invalidRelation.relations.push({
      type: 'covers',
      winner: invalidRelation.patterns[0]!.patternId,
      covered: 'unknown-pattern',
    });
    await expectBlocked(
      validateFixture({ rulePackageInput: invalidRelation }),
      'RULE_PACKAGE_INVALID',
      'RELATION_INVALID',
    );

    const invalidSource = cloneRulePackage();
    invalidSource.patterns[0]!.sourceRefs = ['SRC-UNKNOWN'];
    await expectBlocked(
      validateFixture({ rulePackageInput: invalidSource }),
      'RULE_PACKAGE_INVALID',
      'SOURCE_REFERENCE_INVALID',
    );
  });

  it('blocks missing capabilities', async () => {
    const capabilityRegistry: CapabilityRegistry = {
      capabilities: commonSimpleCapabilityRegistry.capabilities.slice(1),
    };

    await expectBlocked(
      validateFixture({ capabilityRegistry }),
      'RULE_PACKAGE_INVALID',
      'CAPABILITY_INVALID',
    );
  });

  it('blocks an invalid open-kong policy before packaging', async () => {
    const invalidOpenKongPolicy = cloneRulePackage();
    invalidOpenKongPolicy.handModel.openKongPolicy.allowedKinds = [];

    await expectBlocked(
      validateFixture({ rulePackageInput: invalidOpenKongPolicy }),
      'RULE_PACKAGE_INVALID',
      'SCHEMA_INVALID',
    );
  });

  it('blocks enabled and disabled Pattern count drift even with a valid replacement hash', async () => {
    const enabledCountDrift = cloneRulePackage();
    enabledCountDrift.patterns[0]!.enabled = false;
    await updateFixtureHash(enabledCountDrift);
    await expectBlocked(
      validateFixture({ rulePackageInput: enabledCountDrift }),
      'ENABLED_PATTERN_COUNT_DRIFT',
    );

    const disabledCountDrift = cloneRulePackage();
    const removedPattern = disabledCountDrift.patterns.find(({ enabled }) => !enabled);
    expect(removedPattern).toBeDefined();
    disabledCountDrift.patterns = disabledCountDrift.patterns.filter(
      ({ patternId }) => patternId !== removedPattern?.patternId,
    );
    disabledCountDrift.temporaryAdjustments = disabledCountDrift.temporaryAdjustments.filter(
      ({ target }) => target.patternId !== removedPattern?.patternId,
    );
    disabledCountDrift.encyclopedia.patternArticles =
      disabledCountDrift.encyclopedia.patternArticles.filter(
        ({ patternId }) => patternId !== removedPattern?.patternId,
      );
    await updateFixtureHash(disabledCountDrift);
    await expectBlocked(
      validateFixture({ rulePackageInput: disabledCountDrift }),
      'DISABLED_PATTERN_COUNT_DRIFT',
    );
  });

  it('blocks Rule Version drift across the Rule Spec, package, and corpus', async () => {
    const changedRuleSpec = ruleSpecMarkdown.replace(
      '**Rule Version:** `1.0.0`',
      '**Rule Version:** `1.0.1`',
    );

    await expectBlocked(validateFixture({ ruleSpec: changedRuleSpec }), 'RULE_VERSION_DRIFT');
    await expectBlocked(
      validateFixture({ ruleSpec: changedRuleSpec }),
      'CORPUS_RULE_VERSION_DRIFT',
    );
  });

  it('blocks a RuleSource catalog drift and corpus identity drift', async () => {
    const sourceDrift = cloneRulePackage();
    const removedSource = sourceDrift.sources.pop();
    sourceDrift.patterns.forEach((pattern) => {
      pattern.sourceRefs = pattern.sourceRefs.filter(
        (sourceId) => sourceId !== removedSource?.sourceId,
      );
    });
    sourceDrift.encyclopedia.sourceArticles = sourceDrift.encyclopedia.sourceArticles.filter(
      ({ sourceId }) => sourceId !== removedSource?.sourceId,
    );
    await updateFixtureHash(sourceDrift);
    await expectBlocked(validateFixture({ rulePackageInput: sourceDrift }), 'SOURCE_DRIFT');

    await expectBlocked(
      validateFixture({
        ruleCorpusInput: {
          ruleId: 'different-rule',
          ruleVersion: '1.0.0',
          cases: [],
        },
      }),
      'CORPUS_RULE_ID_DRIFT',
    );
  });
});
