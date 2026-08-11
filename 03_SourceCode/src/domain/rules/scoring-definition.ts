import type { RuleDataObject } from './rule-data';

export const EXTRA_SCORING_MODES = ['ADD'] as const;
export const EXTRA_CAP_PLACEMENTS = ['before-cap', 'after-cap'] as const;

export type ExtraScoringMode = (typeof EXTRA_SCORING_MODES)[number];
export type ExtraCapPlacement = (typeof EXTRA_CAP_PLACEMENTS)[number];

export type CapDefinition = Readonly<{
  enabled: boolean;
  value: number | null;
}>;

export type ExtraScoringDefinition = Readonly<{
  extraId: string;
  calculatorKey: string;
  parameters: RuleDataObject;
  mode: ExtraScoringMode;
  value: number;
  capPlacement: ExtraCapPlacement;
}>;

export type ScoringDefinition = Readonly<{
  strategyKey: string;
  unit: string;
  parameters: RuleDataObject;
  cap?: CapDefinition;
  extras?: readonly ExtraScoringDefinition[];
}>;
