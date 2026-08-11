export const PATTERN_RELATION_RESOLUTIONS = ['explicit-priority', 'highest-value'] as const;

export type PatternRelationResolution = (typeof PATTERN_RELATION_RESOLUTIONS)[number];

export type CoversPatternRelation = Readonly<{
  type: 'covers';
  winner: string;
  covered: string;
}>;

export type MutuallyExclusivePatternRelation = Readonly<{
  type: 'mutually-exclusive';
  patterns: readonly string[];
  resolution: PatternRelationResolution;
  priority?: readonly string[];
}>;

export type NonRepeatGroupPatternRelation = Readonly<{
  type: 'non-repeat-group';
  groupId: string;
  patterns: readonly string[];
  resolution: PatternRelationResolution;
  priority?: readonly string[];
}>;

export type PatternRelationDefinition =
  CoversPatternRelation | MutuallyExclusivePatternRelation | NonRepeatGroupPatternRelation;
