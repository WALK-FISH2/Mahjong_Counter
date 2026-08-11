import type { RuleDataValue } from './rule-data';

export const SHA256_CONTENT_HASH_PATTERN = /^[a-f0-9]{64}$/u;

export type RuleContentIdentity = Readonly<{
  ruleId: string;
  ruleVersion: string;
  contentHash: string;
}>;

export type RuleContentIdentityComparison =
  'same-content' | 'distinct-version' | 'immutable-version-conflict';

function canonicalizeValue(value: RuleDataValue, ancestors: WeakSet<object>): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      throw new TypeError('Canonical rule data requires finite JSON numbers.');
    }
    return JSON.stringify(value);
  }

  if (ancestors.has(value)) {
    throw new TypeError('Canonical rule data must not contain circular references.');
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const items = value as readonly RuleDataValue[];
      return `[${items.map((item) => canonicalizeValue(item, ancestors)).join(',')}]`;
    }

    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalizeValue(
            (value as Readonly<Record<string, RuleDataValue>>)[key] as RuleDataValue,
            ancestors,
          )}`,
      )
      .join(',')}}`;
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalizeRuleData(value: RuleDataValue): string {
  return canonicalizeValue(value, new WeakSet<object>());
}

export function compareRuleContentIdentity(
  current: RuleContentIdentity,
  candidate: RuleContentIdentity,
): RuleContentIdentityComparison {
  if (current.ruleId !== candidate.ruleId || current.ruleVersion !== candidate.ruleVersion) {
    return 'distinct-version';
  }

  return current.contentHash === candidate.contentHash
    ? 'same-content'
    : 'immutable-version-conflict';
}
