import type { RuleRef } from '../../domain/mahjong/calculator-document';
import type { EncyclopediaContentBlock } from '../../domain/rules/encyclopedia-definition';
import type { PatternDefinition } from '../../domain/rules/pattern-definition';
import type { PatternRelationDefinition } from '../../domain/rules/pattern-relation';
import type { RuleManifest, RuleStatus } from '../../domain/rules/rule-manifest';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import type { RuleSourceDefinition } from '../../domain/rules/rule-source';
import type { RuleRepository } from '../rules/rule-repository';

export type LoadedRuleEncyclopedia = Readonly<{
  manifest: RuleManifest;
  rulePackage: RulePackageDefinition;
}>;

export type PatternEncyclopediaDetail = Readonly<{
  pattern: PatternDefinition;
  article: readonly EncyclopediaContentBlock[];
  relations: readonly PatternRelationDefinition[];
  sources: readonly RuleSourceDefinition[];
}>;

export class EncyclopediaVersionMismatchError extends Error {
  readonly expected: RuleRef;
  readonly actual: RuleRef;

  constructor(expected: RuleRef, actual: RuleRef) {
    super('RulePackage and encyclopedia identities must match.');
    this.name = 'EncyclopediaVersionMismatchError';
    this.expected = Object.freeze({ ...expected });
    this.actual = Object.freeze({ ...actual });
  }
}

function refOf(ruleId: string, ruleVersion: string): RuleRef {
  return Object.freeze({ ruleId, ruleVersion });
}

export async function loadRuleEncyclopedias(
  repository: RuleRepository,
): Promise<readonly LoadedRuleEncyclopedia[]> {
  const manifests = await repository.listAvailableRules();
  const entries = await Promise.all(
    manifests.map(async (manifest) => {
      const expected = refOf(manifest.ruleId, manifest.ruleVersion);
      const rulePackage = await repository.getInstalledRule(expected);
      const actual = refOf(rulePackage.encyclopedia.ruleId, rulePackage.encyclopedia.ruleVersion);

      if (expected.ruleId !== actual.ruleId || expected.ruleVersion !== actual.ruleVersion) {
        throw new EncyclopediaVersionMismatchError(expected, actual);
      }

      return Object.freeze({ manifest: rulePackage.manifest, rulePackage });
    }),
  );

  return Object.freeze(
    [...entries].sort(
      (left, right) =>
        left.manifest.displayName.localeCompare(right.manifest.displayName, 'zh-CN') ||
        right.manifest.ruleVersion.localeCompare(left.manifest.ruleVersion),
    ),
  );
}

export function filterRuleEncyclopediasByStatus(
  entries: readonly LoadedRuleEncyclopedia[],
  status: RuleStatus | 'all',
): readonly LoadedRuleEncyclopedia[] {
  return status === 'all' ? entries : entries.filter((entry) => entry.manifest.status === status);
}

function relationReferencesPattern(
  relation: PatternRelationDefinition,
  patternId: string,
): boolean {
  if (relation.type === 'covers') {
    return relation.winner === patternId || relation.covered === patternId;
  }
  return relation.patterns.includes(patternId);
}

export function getPatternEncyclopediaDetail(
  rulePackage: RulePackageDefinition,
  patternId: string,
): PatternEncyclopediaDetail | undefined {
  const pattern = rulePackage.patterns.find((candidate) => candidate.patternId === patternId);
  if (pattern === undefined) {
    return undefined;
  }

  const article =
    rulePackage.encyclopedia.patternArticles.find((candidate) => candidate.patternId === patternId)
      ?.blocks ?? [];
  const sourceIds = new Set(pattern.sourceRefs);

  return Object.freeze({
    pattern,
    article,
    relations: Object.freeze(
      rulePackage.relations.filter((relation) => relationReferencesPattern(relation, patternId)),
    ),
    sources: Object.freeze(rulePackage.sources.filter(({ sourceId }) => sourceIds.has(sourceId))),
  });
}
