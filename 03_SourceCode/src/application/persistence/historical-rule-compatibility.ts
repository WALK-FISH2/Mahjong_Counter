import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import {
  evaluateRuleCalculationReadiness,
  type CapabilityRegistry,
} from '../../domain/rules/capability-registry';

function compareVersion(left: string, right: string): number | null {
  const numeric = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
  if (!numeric.test(left) || !numeric.test(right)) return left === right ? 0 : null;
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  if (![...a, ...b].every(Number.isSafeInteger)) return null;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i]! < b[i]! ? -1 : 1;
  return 0;
}
export function canUseHistoricalRule(
  rule: RulePackageDefinition,
  engineVersion: string,
  capabilities: CapabilityRegistry,
): boolean {
  const compatibility = rule.manifest.engineCompatibility;
  const minimum = compareVersion(engineVersion, compatibility.minEngineVersion);
  const maximum =
    compatibility.maxEngineVersion === undefined
      ? 0
      : compareVersion(engineVersion, compatibility.maxEngineVersion);
  return (
    minimum !== null &&
    minimum >= 0 &&
    maximum !== null &&
    maximum <= 0 &&
    evaluateRuleCalculationReadiness(
      capabilities,
      rule.manifest,
      rule.patterns,
      rule.structures,
      rule.scoring,
    ).canCalculate
  );
}
