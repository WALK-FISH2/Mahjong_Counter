export const RULE_MELD_TYPES = ['chow', 'pung', 'open-kong', 'concealed-kong'] as const;
export const FLOWER_POLICIES = ['none', 'separate'] as const;

export type RuleMeldType = (typeof RULE_MELD_TYPES)[number];
export type FlowerPolicy = (typeof FLOWER_POLICIES)[number];

export type HandModelDefinition = Readonly<{
  targetStructuralTileCount: number;
  readyStructuralTileCount: number;
  requiredMeldCount: number;
  allowedMeldTypes: readonly RuleMeldType[];
  maxDeclaredMelds: number;
  flowerPolicy: FlowerPolicy;
}>;
