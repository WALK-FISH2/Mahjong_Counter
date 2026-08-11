export const RULE_SOURCE_TYPES = [
  'official',
  'association',
  'tournament',
  'public-local-rule',
  'corroborating',
] as const;

export type RuleSourceType = (typeof RULE_SOURCE_TYPES)[number];

export type RuleSourceDefinition = Readonly<{
  sourceId: string;
  title: string;
  publisher?: string;
  date?: string;
  url?: string;
  sourceType: RuleSourceType;
  note?: string;
}>;
