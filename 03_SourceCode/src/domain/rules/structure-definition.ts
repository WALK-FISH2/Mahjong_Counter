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

export type SupportedStructureDefinition = Readonly<{
  structureKey: StructureKey;
  capabilityKey: string;
  enabled: boolean;
  supportStatus: 'SUPPORTED';
}>;

export type UnsupportedStructureDefinition = Readonly<{
  structureKey: StructureKey;
  enabled: false;
  supportStatus: 'NOT_SUPPORTED_IN_V0_1';
  reasonCode: 'STRUCTURE_NOT_IMPLEMENTED';
}>;

export type StructureDefinition = SupportedStructureDefinition | UnsupportedStructureDefinition;
