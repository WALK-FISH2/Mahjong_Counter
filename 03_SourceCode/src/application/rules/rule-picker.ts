import type { RuleRef } from '../../domain/mahjong/calculator-document';
import { canRuleEnterCalculator } from '../../domain/rules/rule-manifest';
import type { CalculatorPreferences } from '../preferences';
import type { RuleCatalogEntry } from './rule-repository';

export type RulePickerItem = RuleCatalogEntry &
  Readonly<{
    canCalculate: boolean;
    recentIndex: number | null;
  }>;

export type RulePickerGroup = Readonly<{
  groupId: string;
  items: readonly RulePickerItem[];
}>;

function refEquals(left: RuleRef, right: RuleRef): boolean {
  return left.ruleId === right.ruleId && left.ruleVersion === right.ruleVersion;
}

function includesQuery(entry: RuleCatalogEntry, normalizedQuery: string): boolean {
  return [entry.manifest.displayName, ...entry.aliases].some((candidate) =>
    candidate.toLocaleLowerCase('zh-CN').includes(normalizedQuery),
  );
}

function toPickerItem(entry: RuleCatalogEntry, preferences: CalculatorPreferences): RulePickerItem {
  const recentIndex = preferences.recentRuleRefs.findIndex((ref) => refEquals(ref, entry.manifest));
  return Object.freeze({
    ...entry,
    canCalculate: canRuleEnterCalculator(entry.manifest),
    recentIndex: recentIndex < 0 ? null : recentIndex,
  });
}

function itemOrder(left: RulePickerItem, right: RulePickerItem): number {
  if (left.recentIndex !== null || right.recentIndex !== null) {
    if (left.recentIndex === null) return 1;
    if (right.recentIndex === null) return -1;
    if (left.recentIndex !== right.recentIndex) return left.recentIndex - right.recentIndex;
  }
  if (Boolean(left.manifest.recommended) !== Boolean(right.manifest.recommended)) {
    return left.manifest.recommended ? -1 : 1;
  }
  return left.manifest.displayName.localeCompare(right.manifest.displayName, 'zh-CN');
}

export function createRulePickerGroups(
  entries: readonly RuleCatalogEntry[],
  preferences: CalculatorPreferences,
  query = '',
): readonly RulePickerGroup[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
  const items = entries
    .filter((entry) => normalizedQuery.length === 0 || includesQuery(entry, normalizedQuery))
    .map((entry) => toPickerItem(entry, preferences))
    .sort(itemOrder);
  const groups = new Map<string, RulePickerItem[]>();

  items.forEach((item) => {
    const groupId = item.manifest.region ?? item.manifest.familyId;
    const group = groups.get(groupId) ?? [];
    group.push(item);
    groups.set(groupId, group);
  });

  return Object.freeze(
    [...groups].map(([groupId, groupItems]) =>
      Object.freeze({ groupId, items: Object.freeze(groupItems) }),
    ),
  );
}
