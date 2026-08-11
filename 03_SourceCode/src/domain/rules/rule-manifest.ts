export const RULE_STATUSES = ['development', 'test', 'full'] as const;

export type RuleStatus = (typeof RULE_STATUSES)[number];

export type EngineCompatibility = Readonly<{
  minEngineVersion: string;
  maxEngineVersion?: string;
  requiredCapabilities: readonly string[];
}>;

export type RuleManifest = Readonly<{
  ruleId: string;
  ruleVersion: string;
  displayName: string;
  familyId: string;
  region?: string;
  status: RuleStatus;
  recommended?: boolean;
  engineCompatibility: EngineCompatibility;
  releasedAt: string;
  contentHash: string;
}>;

export function canRuleEnterCalculator(manifest: Pick<RuleManifest, 'status'>): boolean {
  return manifest.status !== 'development';
}
