import type { ContextDefinition } from './context-definition';
import type { EncyclopediaDefinition } from './encyclopedia-definition';
import type { HandModelDefinition } from './hand-model';
import type { LegalityDefinition } from './legality-definition';
import type { PatternDefinition } from './pattern-definition';
import type { PatternRelationDefinition } from './pattern-relation';
import type { RuleManifest } from './rule-manifest';
import type { RuleSourceDefinition } from './rule-source';
import type { ScoringDefinition } from './scoring-definition';
import type { StructureDefinition } from './structure-definition';
import type { TemporaryAdjustmentDefinition } from './temporary-adjustment-definition';
import type { TileSetDefinition } from './tile-set';

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

export type RulePackageDefinition = RulePackage<
  RuleManifest,
  TileSetDefinition,
  HandModelDefinition,
  StructureDefinition,
  ContextDefinition,
  PatternDefinition,
  PatternRelationDefinition,
  ScoringDefinition,
  LegalityDefinition,
  TemporaryAdjustmentDefinition,
  EncyclopediaDefinition,
  RuleSourceDefinition
>;
