import { describe, expect, it } from 'vitest';

import { canRuleEnterCalculator } from '../../domain/rules/rule-manifest';
import { parseRuleManifest, ruleManifestSchema } from './rule-manifest-schema';

function manifest(status: 'development' | 'test' | 'full') {
  return {
    ruleId: 'fixture-rule',
    ruleVersion: '1.0.0',
    displayName: 'Fixture Rule',
    familyId: 'fixture-family',
    status,
    engineCompatibility: {
      minEngineVersion: '0.0.0',
      requiredCapabilities: ['structure.fixture'],
    },
    releasedAt: '2026-08-11T00:00:00.000Z',
    contentHash: '0'.repeat(64),
  } as const;
}

describe('RuleManifest schema and status behavior', () => {
  it('accepts development, test, and full manifests as data', () => {
    expect(parseRuleManifest(manifest('development')).status).toBe('development');
    expect(parseRuleManifest(manifest('test')).status).toBe('test');
    expect(parseRuleManifest(manifest('full')).status).toBe('full');
  });

  it('keeps development rules out of Calculator while allowing test and full rules', () => {
    expect(canRuleEnterCalculator(parseRuleManifest(manifest('development')))).toBe(false);
    expect(canRuleEnterCalculator(parseRuleManifest(manifest('test')))).toBe(true);
    expect(canRuleEnterCalculator(parseRuleManifest(manifest('full')))).toBe(true);
  });

  it('rejects malformed, duplicate-capability, and executable-looking extra fields', () => {
    expect(
      ruleManifestSchema.safeParse({
        ...manifest('test'),
        releasedAt: 'not-an-iso-date',
      }).success,
    ).toBe(false);
    expect(
      ruleManifestSchema.safeParse({
        ...manifest('test'),
        engineCompatibility: {
          minEngineVersion: '0.0.0',
          requiredCapabilities: ['structure.fixture', 'structure.fixture'],
        },
      }).success,
    ).toBe(false);
    expect(
      ruleManifestSchema.safeParse({ ...manifest('test'), scriptUrl: 'https://example.test' })
        .success,
    ).toBe(false);
    expect(
      ruleManifestSchema.safeParse({ ...manifest('test'), contentHash: 'not-a-sha256-hash' })
        .success,
    ).toBe(false);
  });
});
