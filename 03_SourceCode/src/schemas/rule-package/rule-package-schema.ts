import { z } from 'zod';

export type RulePackageComponentSchemas<
  TManifest extends z.ZodType<object>,
  TTileSet extends z.ZodType<object>,
  THandModel extends z.ZodType<object>,
  TStructures extends z.ZodType<readonly object[]>,
  TContexts extends z.ZodType<readonly object[]>,
  TPatterns extends z.ZodType<readonly object[]>,
  TRelations extends z.ZodType<readonly object[]>,
  TScoring extends z.ZodType<object>,
  TLegality extends z.ZodType<object>,
  TTemporaryAdjustments extends z.ZodType<readonly object[]>,
  TEncyclopedia extends z.ZodType<object>,
  TSources extends z.ZodType<readonly object[]>,
> = Readonly<{
  manifest: TManifest;
  tileSet: TTileSet;
  handModel: THandModel;
  structures: TStructures;
  contexts: TContexts;
  patterns: TPatterns;
  relations: TRelations;
  scoring: TScoring;
  legality: TLegality;
  temporaryAdjustments: TTemporaryAdjustments;
  encyclopedia: TEncyclopedia;
  sources: TSources;
}>;

export function createRulePackageSchema<
  const TManifest extends z.ZodType<object>,
  const TTileSet extends z.ZodType<object>,
  const THandModel extends z.ZodType<object>,
  const TStructures extends z.ZodType<readonly object[]>,
  const TContexts extends z.ZodType<readonly object[]>,
  const TPatterns extends z.ZodType<readonly object[]>,
  const TRelations extends z.ZodType<readonly object[]>,
  const TScoring extends z.ZodType<object>,
  const TLegality extends z.ZodType<object>,
  const TTemporaryAdjustments extends z.ZodType<readonly object[]>,
  const TEncyclopedia extends z.ZodType<object>,
  const TSources extends z.ZodType<readonly object[]>,
>(
  components: RulePackageComponentSchemas<
    TManifest,
    TTileSet,
    THandModel,
    TStructures,
    TContexts,
    TPatterns,
    TRelations,
    TScoring,
    TLegality,
    TTemporaryAdjustments,
    TEncyclopedia,
    TSources
  >,
) {
  return z.strictObject({
    schemaVersion: z.number().int().positive().safe(),
    manifest: components.manifest,
    tileSet: components.tileSet,
    handModel: components.handModel,
    structures: components.structures,
    contexts: components.contexts,
    patterns: components.patterns,
    relations: components.relations,
    scoring: components.scoring,
    legality: components.legality,
    temporaryAdjustments: components.temporaryAdjustments,
    encyclopedia: components.encyclopedia,
    sources: components.sources,
  });
}
