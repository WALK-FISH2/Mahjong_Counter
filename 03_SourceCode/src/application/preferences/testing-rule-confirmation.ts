import type { RuleManifest } from '../../domain/rules/rule-manifest';
import {
  ruleRefKey,
  updateCalculatorPreferences,
  type CalculatorPreferencesPort,
} from './calculator-preferences';

export type RuleOutputIdentity = Readonly<{
  ruleId: string;
  ruleVersion: string;
  status: RuleManifest['status'];
  testing: boolean;
}>;

export function createRuleOutputIdentity(manifest: RuleManifest): RuleOutputIdentity {
  return Object.freeze({
    ruleId: manifest.ruleId,
    ruleVersion: manifest.ruleVersion,
    status: manifest.status,
    testing: manifest.status === 'test',
  });
}

export async function requiresTestingRuleConfirmation(
  port: CalculatorPreferencesPort,
  manifest: RuleManifest,
  resultImpactVersion: string,
): Promise<boolean> {
  if (manifest.status !== 'test') return false;

  const preferences = await port.read();
  const confirmation = preferences.testingRuleConfirmations[ruleRefKey(manifest)];
  if (confirmation?.resultImpactVersion === resultImpactVersion) return false;

  return !Object.values(preferences.testingRuleConfirmations).some(
    (candidate) =>
      candidate.ruleRef.ruleId === manifest.ruleId &&
      candidate.resultImpactVersion === resultImpactVersion,
  );
}

export async function confirmTestingRule(
  port: CalculatorPreferencesPort,
  manifest: RuleManifest,
  resultImpactVersion: string,
): Promise<void> {
  await updateCalculatorPreferences(port, (current) => ({
    ...current,
    testingRuleConfirmations: {
      ...current.testingRuleConfirmations,
      [ruleRefKey(manifest)]: {
        ruleRef: { ruleId: manifest.ruleId, ruleVersion: manifest.ruleVersion },
        resultImpactVersion,
      },
    },
  }));
}
