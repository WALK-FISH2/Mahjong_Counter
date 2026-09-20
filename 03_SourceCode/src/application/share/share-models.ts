import type { CalculatorDocument, RuleRef } from '../../domain/mahjong';
import type { SavedResultSnapshot } from '../examples/persistence-models';
import type { ReadyAnalysisOutcome } from '../ready-analysis';

// A separate long-lived wire contract, not a Saved/Draft record or runtime Store.
export type ShareableCalculatorState = Readonly<{
  schemaVersion: 1;
  ruleRef: RuleRef;
  hand: CalculatorDocument['hand'];
  context: CalculatorDocument['context'];
  temporaryRuleAdjustment: CalculatorDocument['temporaryRuleAdjustment'];
  fanAdjustments: CalculatorDocument['fanAdjustments'];
}>;
export type ShareLayer = 'preset' | 'session-rule' | 'user-adjusted';
export type ShareRuleInfo = Readonly<{
  name: string;
  status: 'test' | 'full';
  contentHash: string;
  engineVersion: string;
}>;
export type ShareResultSnapshot =
  | Readonly<{ kind: 'evaluation'; value: SavedResultSnapshot }>
  | Readonly<{
      kind: 'ready-analysis';
      mode: 'ordinary' | 'ignore-winning-tile';
      preset: ReadyAnalysisOutcome;
      sessionRule?: ReadyAnalysisOutcome;
    }>;
export type SharePayloadV1 = Readonly<{
  format: 'mahjong-share';
  version: 1;
  contentType: 'legal-win' | 'cannot-win' | 'ready-analysis';
  calculator: ShareableCalculatorState;
  rule: ShareRuleInfo;
  view: Readonly<{ layer: ShareLayer; candidateId: string | null }>;
  resultSnapshot: ShareResultSnapshot;
}>;
export type ShareUrlResult =
  | Readonly<{ status: 'ready'; url: string }>
  | Readonly<{ status: 'capability-unavailable'; capability: 'compression-stream' }>
  | Readonly<{ status: 'single-example-fallback-required'; length: number }>;
export interface ShareCodecPort {
  encode(payload: SharePayloadV1, baseUrl: string): Promise<ShareUrlResult>;
  decode(encoded: string): Promise<SharePayloadV1>;
}
export class ShareError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'ShareError';
  }
}
