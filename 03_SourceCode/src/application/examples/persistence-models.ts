import type { CalculatorDocument, RuleRef } from '../../domain/mahjong/calculator-document';
import type { HandSnapshot } from '../../domain/mahjong/hand';
import type { WinContext } from '../../domain/mahjong/context';
import type { CandidateResult } from '../../domain/engine/evaluation';
import type { StructureEnumerationResult } from '../../domain/engine/structure';
import type { UserAdjustedScore } from '../../domain/engine/adjustment';

// Storage contracts deliberately exclude Store actions and executable rule capabilities.
// Shared leaf types describe immutable facts; runtime schema validation is mandatory.
export type PersistedCalculatorState = Readonly<{
  schemaVersion: number;
  ruleRef: RuleRef;
  hand: HandSnapshot;
  context: WinContext;
  temporaryRuleAdjustment: CalculatorDocument['temporaryRuleAdjustment'];
  fanAdjustments: CalculatorDocument['fanAdjustments'];
  transientInput: CalculatorDocument['transientInput'];
  source: CalculatorDocument['source'];
  revision: number;
}>;

export type SerializableCandidate = Readonly<{
  candidateId: string;
  placed: CandidateResult['placed'];
  recognition: CandidateResult['recognition'];
  relation: CandidateResult['relation'];
  score: CandidateResult['score'];
  legality: CandidateResult['legality'];
  explanation: CandidateResult['explanation'];
}>;

type EvaluationFacts = Readonly<{
  ruleRef: RuleRef;
  candidates: readonly SerializableCandidate[];
  highestLegalCandidateIds: readonly string[];
  selectedCandidateId: string | null;
}>;

export type SerializableEvaluation = EvaluationFacts &
  (
    | Readonly<{ status: 'legal-win' | 'structural-win-but-illegal' | 'incomplete-context' }>
    | Readonly<{ status: 'not-winning'; structure: StructureEnumerationResult }>
  );

export type SerializableUserAdjustment = Readonly<{
  baseLayer: 'preset' | 'session-rule';
  adjustments: CalculatorDocument['fanAdjustments'];
  result: UserAdjustedScore;
}>;

// Display-only data. This cannot satisfy RulePackageDefinition and must never enter Engine.
export type ResultDisplaySnapshot = Readonly<{
  patterns: readonly Readonly<{ patternId: string; name: string; value: number | string }>[];
  scoring: Readonly<{ unit: string }>;
  sources: readonly Readonly<{ sourceId: string; title: string; url?: string }>[];
}>;

export type SavedResultSnapshot = Readonly<{
  documentRevision: number;
  presetResult: SerializableEvaluation;
  sessionRuleResult?: SerializableEvaluation;
  userAdjustedResult?: SerializableUserAdjustment;
  highestCandidateIds: readonly string[];
  lastViewedCandidateId: string | null;
  lastViewedLayer: 'preset' | 'session-rule' | 'user-adjusted';
  ruleRef: RuleRef;
  engineVersion: string;
  display: Readonly<{
    ruleName: string;
    ruleStatus: 'development' | 'test' | 'full';
    ruleContentHash: string;
    warnings: readonly string[];
    contextLabels: readonly Readonly<{
      contextId: string;
      labelKey: string;
      options: readonly Readonly<{ value: boolean | number | string; labelKey: string }>[];
    }>[];
    adjustmentLabels: readonly Readonly<{ adjustmentId: string; labelKey: string }>[];
    preset: ResultDisplaySnapshot;
    sessionRule?: ResultDisplaySnapshot;
  }>;
}>;

export type SavedExampleRecord = Readonly<{
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  calculator: PersistedCalculatorState;
  resultSnapshot: SavedResultSnapshot;
  ruleRef: RuleRef;
  engineVersion: string;
  dataSchemaVersion: number;
}>;
