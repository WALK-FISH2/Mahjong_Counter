export type RulePackage<
  TManifest,
  TTileSet,
  THandModel,
  TStructure,
  TContext,
  TPattern,
  TRelation,
  TScoring,
  TLegality,
  TTemporaryAdjustment,
  TEncyclopedia,
  TRuleSource,
> = Readonly<{
  schemaVersion: number;
  manifest: TManifest;
  tileSet: TTileSet;
  handModel: THandModel;
  structures: readonly TStructure[];
  contexts: readonly TContext[];
  patterns: readonly TPattern[];
  relations: readonly TRelation[];
  scoring: TScoring;
  legality: TLegality;
  temporaryAdjustments: readonly TTemporaryAdjustment[];
  encyclopedia: TEncyclopedia;
  sources: readonly TRuleSource[];
}>;
