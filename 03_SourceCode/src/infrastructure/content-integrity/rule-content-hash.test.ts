import { describe, expect, it } from 'vitest';

import {
  canonicalizeRuleData,
  compareRuleContentIdentity,
} from '../../domain/rules/content-integrity';
import { patternCatalogWithSourcesSchema } from '../../schemas/rule-package/pattern-catalog-schema';
import { ruleManifestSchema } from '../../schemas/rule-package/rule-manifest-schema';
import { calculateRuleContentHash, verifyRuleContentHash } from './rule-content-hash';

const EXPECTED_FIXTURE_HASH = '43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777';

describe('Rule content integrity', () => {
  it('canonicalizes object key order and produces a stable SHA-256 digest', async () => {
    const first = { b: 2, a: 1 } as const;
    const reordered = { a: 1, b: 2 } as const;

    expect(canonicalizeRuleData(first)).toBe('{"a":1,"b":2}');
    await expect(calculateRuleContentHash(first)).resolves.toBe(EXPECTED_FIXTURE_HASH);
    await expect(calculateRuleContentHash(reordered)).resolves.toBe(EXPECTED_FIXTURE_HASH);
  });

  it('detects content changes without treating the digest as a source signature', async () => {
    await expect(verifyRuleContentHash({ a: 1, b: 2 }, EXPECTED_FIXTURE_HASH)).resolves.toBe(true);
    await expect(verifyRuleContentHash({ a: 1, b: 3 }, EXPECTED_FIXTURE_HASH)).resolves.toBe(false);
    await expect(verifyRuleContentHash({ a: 1, b: 2 }, 'untrusted-signature')).resolves.toBe(false);
  });

  it('detects immutable-version conflicts separately from new versions', () => {
    const current = {
      ruleId: 'fixture-rule',
      ruleVersion: '1.0.0',
      contentHash: EXPECTED_FIXTURE_HASH,
    };

    expect(compareRuleContentIdentity(current, current)).toBe('same-content');
    expect(
      compareRuleContentIdentity(current, {
        ...current,
        contentHash: '0'.repeat(64),
      }),
    ).toBe('immutable-version-conflict');
    expect(
      compareRuleContentIdentity(current, {
        ...current,
        ruleVersion: '1.0.1',
        contentHash: '0'.repeat(64),
      }),
    ).toBe('distinct-version');
  });

  it('validates manifest digests and Pattern source references as untrusted input', () => {
    const manifest = {
      ruleId: 'fixture-rule',
      ruleVersion: '1.0.0',
      displayName: 'Fixture Rule',
      familyId: 'fixture-family',
      status: 'test',
      engineCompatibility: { minEngineVersion: '0.0.0', requiredCapabilities: [] },
      releasedAt: '2026-08-11T00:00:00.000Z',
      contentHash: EXPECTED_FIXTURE_HASH,
    };
    const source = {
      sourceId: 'fixture-source',
      title: 'Fixture Source',
      sourceType: 'corroborating',
    };
    const pattern = {
      patternId: 'fixturePattern',
      name: 'Fixture Pattern',
      recognizerKey: 'recognizer.fixture',
      value: 1,
      unit: 'fan',
      enabled: true,
      sourceRefs: ['fixture-source'],
    };

    expect(ruleManifestSchema.safeParse(manifest).success).toBe(true);
    expect(
      ruleManifestSchema.safeParse({
        ...manifest,
        contentHash: EXPECTED_FIXTURE_HASH.toUpperCase(),
      }).success,
    ).toBe(false);
    expect(
      patternCatalogWithSourcesSchema.safeParse({ patterns: [pattern], sources: [source] }).success,
    ).toBe(true);
    expect(
      patternCatalogWithSourcesSchema.safeParse({
        patterns: [{ ...pattern, sourceRefs: ['missing-source'] }],
        sources: [source],
      }).success,
    ).toBe(false);
  });
});
