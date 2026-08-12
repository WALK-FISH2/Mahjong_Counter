import { describe, expect, it } from 'vitest';

import type { RuleManifest } from '../../domain/rules/rule-manifest';
import {
  DEFAULT_CALCULATOR_PREFERENCES,
  InMemoryCalculatorPreferencesPort,
  consumeOnboarding,
  recordRecentlyUsedRule,
  replayOnboarding,
} from './calculator-preferences';
import {
  confirmTestingRule,
  createRuleOutputIdentity,
  requiresTestingRuleConfirmation,
} from './testing-rule-confirmation';

const TEST_MANIFEST: RuleManifest = {
  ruleId: 'test-rule',
  ruleVersion: '1.0.0',
  displayName: '测试规则',
  familyId: 'fixture',
  status: 'test',
  engineCompatibility: { minEngineVersion: '0.0.0', requiredCapabilities: [] },
  releasedAt: '2026-08-12T00:00:00.000Z',
  contentHash: 'a'.repeat(64),
};

describe('Calculator Preferences Port', () => {
  it('records recent rules through the port without storing a CalculatorDocument', async () => {
    const port = new InMemoryCalculatorPreferencesPort();
    await recordRecentlyUsedRule(port, { ruleId: 'first', ruleVersion: '1.0.0' });
    await recordRecentlyUsedRule(port, { ruleId: 'second', ruleVersion: '2.0.0' });
    await recordRecentlyUsedRule(port, { ruleId: 'first', ruleVersion: '1.0.0' });

    await expect(port.read()).resolves.toMatchObject({
      lastRuleRef: { ruleId: 'first', ruleVersion: '1.0.0' },
      recentRuleRefs: [
        { ruleId: 'first', ruleVersion: '1.0.0' },
        { ruleId: 'second', ruleVersion: '2.0.0' },
      ],
    });
  });

  it('shows onboarding once and allows Settings to schedule a replay', async () => {
    const port = new InMemoryCalculatorPreferencesPort();

    await expect(consumeOnboarding(port)).resolves.toEqual({
      showRuleNotice: true,
      showInputGuide: true,
    });
    await expect(consumeOnboarding(port)).resolves.toEqual({
      showRuleNotice: false,
      showInputGuide: false,
    });
    await replayOnboarding(port);
    await expect(consumeOnboarding(port)).resolves.toEqual({
      showRuleNotice: true,
      showInputGuide: true,
    });
  });

  it('clones values at the in-memory boundary', async () => {
    const port = new InMemoryCalculatorPreferencesPort(DEFAULT_CALCULATOR_PREFERENCES);
    const first = await port.read();
    const second = await port.read();
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });
});

describe('TESTING rule confirmation', () => {
  it('requires first confirmation and only repeats for a changed result-impact version', async () => {
    const port = new InMemoryCalculatorPreferencesPort();

    await expect(requiresTestingRuleConfirmation(port, TEST_MANIFEST, 'rules-v1')).resolves.toBe(
      true,
    );
    await confirmTestingRule(port, TEST_MANIFEST, 'rules-v1');
    await expect(requiresTestingRuleConfirmation(port, TEST_MANIFEST, 'rules-v1')).resolves.toBe(
      false,
    );
    await expect(
      requiresTestingRuleConfirmation(port, { ...TEST_MANIFEST, ruleVersion: '1.0.1' }, 'rules-v1'),
    ).resolves.toBe(false);
    await expect(
      requiresTestingRuleConfirmation(port, { ...TEST_MANIFEST, ruleVersion: '1.1.0' }, 'rules-v2'),
    ).resolves.toBe(true);
  });

  it('does not gate full rules and preserves testing/version output identity', async () => {
    const port = new InMemoryCalculatorPreferencesPort();
    await expect(
      requiresTestingRuleConfirmation(port, { ...TEST_MANIFEST, status: 'full' }, 'rules-v1'),
    ).resolves.toBe(false);
    expect(createRuleOutputIdentity(TEST_MANIFEST)).toEqual({
      ruleId: 'test-rule',
      ruleVersion: '1.0.0',
      status: 'test',
      testing: true,
    });
  });
});
