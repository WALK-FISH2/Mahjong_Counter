export const RULE_CASE_KINDS = ['positive', 'negative', 'relation', 'structure'] as const;

export type RuleCaseKind = (typeof RULE_CASE_KINDS)[number];

export type RuleCaseIndexEntry = Readonly<{
  caseId: string;
  patternId?: string;
  kind: RuleCaseKind;
}>;

export type RuleCorpusIndex = Readonly<{
  ruleId: string;
  ruleVersion: string;
  cases: readonly RuleCaseIndexEntry[];
}>;
