export type EncyclopediaContentBlock =
  | Readonly<{ type: 'paragraph'; text: string }>
  | Readonly<{ type: 'list'; items: readonly string[] }>;

export type PatternArticleDefinition = Readonly<{
  patternId: string;
  blocks: readonly EncyclopediaContentBlock[];
}>;

export type EncyclopediaExampleDefinition = Readonly<{
  exampleId: string;
  title: string;
  ruleCaseId: string;
}>;

export type SourceArticleDefinition = Readonly<{
  sourceId: string;
  blocks: readonly EncyclopediaContentBlock[];
}>;

export type EncyclopediaDefinition = Readonly<{
  ruleId: string;
  ruleVersion: string;
  intro: readonly EncyclopediaContentBlock[];
  patternArticles: readonly PatternArticleDefinition[];
  examples: readonly EncyclopediaExampleDefinition[];
  sourceArticles: readonly SourceArticleDefinition[];
  knownLimitations: readonly EncyclopediaContentBlock[];
}>;
