import { describe, expect, it } from 'vitest';

import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import type { RuleRef } from '../../domain/mahjong/calculator-document';
import type { RuleStatus } from '../../domain/rules/rule-manifest';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import type { RuleRepository } from '../rules/rule-repository';
import {
  filterRuleEncyclopediasByStatus,
  getPatternEncyclopediaDetail,
  loadRuleEncyclopedias,
  type EncyclopediaVersionMismatchError,
  type LoadedRuleEncyclopedia,
} from './rule-encyclopedia';

function repositoryFor(rulePackage: RulePackageDefinition): RuleRepository {
  return {
    getInstalledRule: () => Promise.resolve(rulePackage),
    listInstalledRules: () => Promise.resolve([rulePackage.manifest]),
    listAvailableRules: () => Promise.resolve([rulePackage.manifest]),
    listRuleCatalog: () => Promise.resolve([]),
    downloadRule: () => Promise.resolve(),
    removeRule: () => Promise.resolve(),
  };
}

function entry(status: RuleStatus): LoadedRuleEncyclopedia {
  const manifest = Object.freeze({ ...commonSimpleRulePackage.manifest, status });
  return Object.freeze({ manifest, rulePackage: commonSimpleRulePackage });
}

describe('Rule Encyclopedia application queries', () => {
  it('loads encyclopedia content only when its identity matches the RulePackage version', async () => {
    const [loaded] = await loadRuleEncyclopedias(repositoryFor(commonSimpleRulePackage));

    expect(loaded?.manifest.ruleId).toBe(commonSimpleRulePackage.encyclopedia.ruleId);
    expect(loaded?.manifest.ruleVersion).toBe(commonSimpleRulePackage.encyclopedia.ruleVersion);

    const mismatched = Object.freeze({
      ...commonSimpleRulePackage,
      encyclopedia: Object.freeze({
        ...commonSimpleRulePackage.encyclopedia,
        ruleVersion: '0.9.0',
      }),
    });

    await expect(loadRuleEncyclopedias(repositoryFor(mismatched))).rejects.toMatchObject({
      name: 'EncyclopediaVersionMismatchError',
      expected: { ruleId: 'common-simple', ruleVersion: '1.0.0' } satisfies RuleRef,
      actual: { ruleId: 'common-simple', ruleVersion: '0.9.0' } satisfies RuleRef,
    } satisfies Partial<EncyclopediaVersionMismatchError>);
  });

  it('filters development, test, and full rule statuses without changing the source entries', () => {
    const entries = [entry('development'), entry('test'), entry('full')];

    expect(filterRuleEncyclopediasByStatus(entries, 'all')).toHaveLength(3);
    expect(
      filterRuleEncyclopediasByStatus(entries, 'development').map((item) => item.manifest.status),
    ).toEqual(['development']);
    expect(
      filterRuleEncyclopediasByStatus(entries, 'test').map((item) => item.manifest.status),
    ).toEqual(['test']);
    expect(
      filterRuleEncyclopediasByStatus(entries, 'full').map((item) => item.manifest.status),
    ).toEqual(['full']);
  });

  it('resolves a pattern article, relations, and sources by stable Pattern ref', () => {
    const detail = getPatternEncyclopediaDetail(commonSimpleRulePackage, 'bigFourWinds');

    expect(detail?.pattern).toBe(
      commonSimpleRulePackage.patterns.find(({ patternId }) => patternId === 'bigFourWinds'),
    );
    expect(detail?.article).not.toHaveLength(0);
    expect(detail?.relations).toContainEqual(
      expect.objectContaining({ type: 'covers', winner: 'bigFourWinds' }),
    );
    expect(detail?.sources.map(({ sourceId }) => sourceId)).toContain('SRC-A01');
  });
});
