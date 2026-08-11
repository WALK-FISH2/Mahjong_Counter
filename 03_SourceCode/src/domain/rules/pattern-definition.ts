import type { RuleDataObject } from './rule-data';

export const PATTERN_CONFIDENCE_LEVELS = ['high', 'medium', 'disputed'] as const;

export type PatternConfidence = (typeof PATTERN_CONFIDENCE_LEVELS)[number];

export type PatternDefinition = Readonly<{
  patternId: string;
  name: string;
  aliases?: readonly string[];
  recognizerKey: string;
  recognizerParams?: RuleDataObject;
  value: number | string;
  unit: string;
  enabled: boolean;
  sourceRefs: readonly string[];
  confidence?: PatternConfidence;
}>;
