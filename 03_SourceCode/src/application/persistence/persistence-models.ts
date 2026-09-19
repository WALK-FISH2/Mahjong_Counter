import type { PersistedCalculatorState, SavedExampleRecord } from '../examples/persistence-models';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import type { RuleRef } from '../../domain/mahjong';

export type TrashExampleRecord = SavedExampleRecord & Readonly<{ trashedAt: string }>;

// Application editing metadata supplements, but never changes, the Domain document.
export type DraftContent = Readonly<{
  calculator: PersistedCalculatorState;
  editingMeldId: string | null;
  editingOrigin: SavedExampleRecord | null;
}>;
export type EditorLease = Readonly<{ owner: string; token: string; expiresAt: number }>;
export type DraftRecord = DraftContent &
  Readonly<{
    key: 'current';
    formatVersion: 1;
    savedAt: string;
    writeToken: string;
    lease: EditorLease | null;
  }>;

// All calculation data is retained for edits; large encyclopedia prose/examples are omitted.
// This is never a second authored rule source and is not installed for new calculations.
export type MinimalRuleSnapshot = Omit<RulePackageDefinition, 'encyclopedia'>;
export type RuleSnapshotRecord = Readonly<{
  snapshotId: string;
  formatVersion: 1;
  ruleRef: RuleRef;
  contentHash: string;
  payload: MinimalRuleSnapshot;
}>;
