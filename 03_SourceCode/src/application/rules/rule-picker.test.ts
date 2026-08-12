import { describe, expect, it } from 'vitest';

import { DEFAULT_CALCULATOR_PREFERENCES } from '../preferences';
import type { RuleCatalogEntry } from './rule-repository';
import { createRulePickerGroups } from './rule-picker';

function entry(
  ruleId: string,
  displayName: string,
  status: 'development' | 'test' | 'full',
  aliases: readonly string[],
  region = 'general',
): RuleCatalogEntry {
  return {
    aliases,
    resultImpactVersion: '1',
    manifest: {
      ruleId,
      ruleVersion: '1.0.0',
      displayName,
      familyId: 'fixture',
      region,
      status,
      recommended: ruleId === 'recommended',
      engineCompatibility: { minEngineVersion: '0.0.0', requiredCapabilities: [] },
      releasedAt: '2026-08-12T00:00:00.000Z',
      contentHash: 'a'.repeat(64),
    },
  };
}

const ENTRIES = [
  entry('development', '开发规则', 'development', ['内部']),
  entry('recommended', '默认规则', 'test', ['大众麻将']),
  entry('recent', '最近规则', 'full', ['别名搜索'], 'regional'),
];

describe('Rule Picker projection', () => {
  it('groups by rule data, puts recent rules first, and exposes state permissions', () => {
    const groups = createRulePickerGroups(ENTRIES, {
      ...DEFAULT_CALCULATOR_PREFERENCES,
      recentRuleRefs: [{ ruleId: 'recent', ruleVersion: '1.0.0' }],
    });

    expect(groups.flatMap(({ items }) => items).map(({ manifest }) => manifest.ruleId)).toEqual([
      'recent',
      'recommended',
      'development',
    ]);
    expect(
      groups
        .flatMap(({ items }) => items)
        .find(({ manifest }) => manifest.ruleId === 'development'),
    ).toMatchObject({ canCalculate: false });
    expect(groups.map(({ groupId }) => groupId)).toEqual(['regional', 'general']);
  });

  it('searches both display name and aliases without ruleId branches', () => {
    expect(
      createRulePickerGroups(ENTRIES, DEFAULT_CALCULATOR_PREFERENCES, '大众').flatMap(({ items }) =>
        items.map(({ manifest }) => manifest.ruleId),
      ),
    ).toEqual(['recommended']);
    expect(
      createRulePickerGroups(ENTRIES, DEFAULT_CALCULATOR_PREFERENCES, '别名搜索').flatMap(
        ({ items }) => items.map(({ manifest }) => manifest.ruleId),
      ),
    ).toEqual(['recent']);
  });
});
