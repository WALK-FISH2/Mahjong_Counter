import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

import { commonSimpleRulePackage } from '../../src/content/rules/common-simple/parsed-rule-package.ts';
import {
  COMMON_SIMPLE_STRUCTURE_RULE_CASES,
  type StructureRuleTestCase,
} from '../../src/content/rules/common-simple/structure-rule-cases.ts';
import type { RulePackageDefinition } from '../../src/domain/rules/rule-package.ts';

export const CORE_ENCYCLOPEDIA_DIRECTORY = 'encyclopedia';

export function getCoreEncyclopediaFileName(rule: RulePackageDefinition): string {
  return `${CORE_ENCYCLOPEDIA_DIRECTORY}/${rule.manifest.ruleId}@${rule.manifest.ruleVersion}.json`;
}

export const CORE_ENCYCLOPEDIA_RESOURCE_MANIFEST_FILE = `${CORE_ENCYCLOPEDIA_DIRECTORY}/offline-resources.json`;

export function createCoreEncyclopediaBundle(
  rule: RulePackageDefinition,
  ruleCases: readonly StructureRuleTestCase[] = COMMON_SIMPLE_STRUCTURE_RULE_CASES,
) {
  const referencedCaseIds = new Set(rule.encyclopedia.examples.map(({ ruleCaseId }) => ruleCaseId));
  return Object.freeze({
    schemaVersion: 1,
    ruleRef: Object.freeze({
      ruleId: rule.manifest.ruleId,
      ruleVersion: rule.manifest.ruleVersion,
    }),
    contentHash: rule.manifest.contentHash,
    manifest: rule.manifest,
    patterns: rule.patterns,
    relations: rule.relations,
    encyclopedia: rule.encyclopedia,
    exampleRuleCases: Object.freeze(
      ruleCases.filter(
        ({ id, ruleRef }) =>
          referencedCaseIds.has(id) &&
          ruleRef.ruleId === rule.manifest.ruleId &&
          ruleRef.ruleVersion === rule.manifest.ruleVersion,
      ),
    ),
    sources: rule.sources,
  });
}

export function createCoreEncyclopediaBundleRevision(
  bundle: ReturnType<typeof createCoreEncyclopediaBundle>,
): string {
  return createHash('sha256').update(JSON.stringify(bundle)).digest('hex');
}

export function createCoreEncyclopediaResourceManifest(
  rule: RulePackageDefinition,
  bundle = createCoreEncyclopediaBundle(rule),
) {
  const bundleRevision = createCoreEncyclopediaBundleRevision(bundle);
  return Object.freeze({
    schemaVersion: 1,
    purpose: 'm11-service-worker-input',
    generatedFrom: Object.freeze({
      ruleId: rule.manifest.ruleId,
      ruleVersion: rule.manifest.ruleVersion,
      contentHash: rule.manifest.contentHash,
      bundleRevision,
    }),
    resources: Object.freeze([
      Object.freeze({
        url: `/${getCoreEncyclopediaFileName(rule)}`,
        kind: 'core-encyclopedia',
        revision: bundleRevision,
      }),
    ]),
  });
}

function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function coreEncyclopediaArtifactsPlugin(): Plugin {
  return {
    name: 'core-encyclopedia-artifacts',
    apply: 'build',
    generateBundle() {
      const bundle = createCoreEncyclopediaBundle(commonSimpleRulePackage);
      this.emitFile({
        type: 'asset',
        fileName: getCoreEncyclopediaFileName(commonSimpleRulePackage),
        source: serialize(bundle),
      });
      this.emitFile({
        type: 'asset',
        fileName: CORE_ENCYCLOPEDIA_RESOURCE_MANIFEST_FILE,
        source: serialize(createCoreEncyclopediaResourceManifest(commonSimpleRulePackage, bundle)),
      });
    },
  };
}
