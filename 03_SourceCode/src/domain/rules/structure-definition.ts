import type { TileCode } from '../mahjong/tile';

export const STRUCTURE_KEYS = [
  'standard-meld-pair',
  'seven-pairs',
  'thirteen-orphans',
  'all-unrelated',
  'seven-star-unrelated',
  'knitted-straight',
] as const;

export const STRUCTURE_SUPPORT_STATUSES = ['SUPPORTED', 'NOT_SUPPORTED_IN_V0_1'] as const;

export type StructureKey = (typeof STRUCTURE_KEYS)[number];
export type StructureSupportStatus = (typeof STRUCTURE_SUPPORT_STATUSES)[number];

type SupportedStructureDefinitionBase = Readonly<{
  enabled: boolean;
  supportStatus: 'SUPPORTED';
}>;

export type StandardStructureDefinition = SupportedStructureDefinitionBase &
  Readonly<{
    structureKey: 'standard-meld-pair';
    capabilityKey: string;
  }>;

export const SEVEN_PAIRS_QUAD_HANDLINGS = ['TWO_PAIRS', 'NOT_ALLOWED'] as const;

export type SevenPairsQuadHandling = (typeof SEVEN_PAIRS_QUAD_HANDLINGS)[number];

export type SevenPairsStructureDefinition = SupportedStructureDefinitionBase &
  Readonly<{
    structureKey: 'seven-pairs';
    capabilityKey: string;
    parameters: Readonly<{
      requiredPairCount: number;
      quadHandling: SevenPairsQuadHandling;
    }>;
  }>;

export type ThirteenOrphansStructureDefinition = SupportedStructureDefinitionBase &
  Readonly<{
    structureKey: 'thirteen-orphans';
    capabilityKey: string;
    parameters: Readonly<{
      requiredTiles: readonly TileCode[];
      duplicateTileCount: number;
    }>;
  }>;

export type SupportedStructureDefinition =
  StandardStructureDefinition | SevenPairsStructureDefinition | ThirteenOrphansStructureDefinition;

export type UnsupportedStructureDefinition = Readonly<{
  structureKey: StructureKey;
  enabled: false;
  supportStatus: 'NOT_SUPPORTED_IN_V0_1';
  reasonCode: 'STRUCTURE_NOT_IMPLEMENTED';
}>;

export type StructureDefinition = SupportedStructureDefinition | UnsupportedStructureDefinition;
