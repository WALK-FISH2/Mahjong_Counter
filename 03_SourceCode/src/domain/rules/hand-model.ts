import type { OpenKongKind } from '../mahjong/meld';

export const RULE_MELD_TYPES = ['chow', 'pung', 'open-kong', 'concealed-kong'] as const;
export const FLOWER_POLICIES = ['none', 'separate'] as const;
export const OPEN_KONG_DISTINCTIONS = ['undifferentiated', 'distinguished'] as const;

export type RuleMeldType = (typeof RULE_MELD_TYPES)[number];
export type FlowerPolicy = (typeof FLOWER_POLICIES)[number];
export type OpenKongDistinction = (typeof OPEN_KONG_DISTINCTIONS)[number];
export type OpenKongPolicy = Readonly<{
  distinction: OpenKongDistinction;
  allowedKinds: readonly OpenKongKind[];
}>;

export type HandModelDefinition = Readonly<{
  targetStructuralTileCount: number;
  readyStructuralTileCount: number;
  requiredMeldCount: number;
  allowedMeldTypes: readonly RuleMeldType[];
  openKongPolicy: OpenKongPolicy;
  maxDeclaredMelds: number;
  flowerPolicy: FlowerPolicy;
}>;
