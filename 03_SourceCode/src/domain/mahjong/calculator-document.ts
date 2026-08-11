import { createWinContext, type WinContext } from './context';
import { createHandSnapshot, type HandSnapshot } from './hand';
import {
  NO_TRANSIENT_INPUT,
  type TransientChowSelection,
  type TransientInputSession,
} from './meld-input-state';

export type RuleRef = Readonly<{
  ruleId: string;
  ruleVersion: string;
}>;

export type SerializablePrimitive = boolean | number | string | null;
export type SerializableValue =
  | SerializablePrimitive
  | readonly SerializableValue[]
  | Readonly<{ [key: string]: SerializableValue }>;

/**
 * The document stores adjustment facts only. Rule-defined adjustment schemas and
 * their application behavior remain responsibilities of later milestones.
 */
export type TemporaryRuleAdjustment = Readonly<{
  baseRuleRef: RuleRef;
  values: Readonly<Record<string, SerializableValue>>;
}>;

export type FanAdjustment =
  | Readonly<{ patternId: string; action: 'exclude' }>
  | Readonly<{
      patternId: string;
      action: 'force-include';
      confirmedConflictSignature?: string;
    }>;

export type CalculatorDocumentSource =
  | Readonly<{ kind: 'new' }>
  | Readonly<{ kind: 'draft' }>
  | Readonly<{ kind: 'saved-example'; exampleId: string }>
  | Readonly<{ kind: 'shared' }>
  | Readonly<{ kind: 'imported' }>
  | Readonly<{ kind: 'encyclopedia-example'; exampleId: string }>;

export type CalculatorDocument = Readonly<{
  schemaVersion: number;
  ruleRef: RuleRef;
  hand: HandSnapshot;
  context: WinContext;
  temporaryRuleAdjustment: TemporaryRuleAdjustment | null;
  fanAdjustments: readonly FanAdjustment[];
  transientInput: TransientInputSession;
  source: CalculatorDocumentSource;
  revision: number;
}>;

export type CalculatorDocumentInput = Readonly<{
  schemaVersion: number;
  ruleRef: RuleRef;
  hand: HandSnapshot;
  context: WinContext;
  temporaryRuleAdjustment?: TemporaryRuleAdjustment | null;
  fanAdjustments?: readonly FanAdjustment[];
  transientInput?: TransientInputSession;
  source?: CalculatorDocumentSource;
  revision?: number;
}>;

function assertNonNegativeSafeInteger(value: number, fieldName: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${fieldName} must be a non-negative safe integer.`);
  }
}

function cloneRuleRef(ruleRef: RuleRef): RuleRef {
  return Object.freeze({ ...ruleRef });
}

function cloneSerializableValue(value: SerializableValue): SerializableValue {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new RangeError('Serializable number values must be finite.');
  }

  if (Array.isArray(value)) {
    return Object.freeze(value.map(cloneSerializableValue));
  }

  if (value !== null && typeof value === 'object') {
    const cloned: Record<string, SerializableValue> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      cloned[key] = cloneSerializableValue(nestedValue);
    }

    return Object.freeze(cloned);
  }

  return value;
}

function cloneTemporaryRuleAdjustment(
  adjustment: TemporaryRuleAdjustment | null,
): TemporaryRuleAdjustment | null {
  if (adjustment === null) {
    return null;
  }

  const values: Record<string, SerializableValue> = {};

  for (const [key, value] of Object.entries(adjustment.values)) {
    values[key] = cloneSerializableValue(value);
  }

  return Object.freeze({
    baseRuleRef: cloneRuleRef(adjustment.baseRuleRef),
    values: Object.freeze(values),
  });
}

function cloneFanAdjustment(adjustment: FanAdjustment): FanAdjustment {
  if (adjustment.action === 'exclude') {
    return Object.freeze({ patternId: adjustment.patternId, action: adjustment.action });
  }

  return Object.freeze(
    adjustment.confirmedConflictSignature === undefined
      ? { patternId: adjustment.patternId, action: adjustment.action }
      : {
          patternId: adjustment.patternId,
          action: adjustment.action,
          confirmedConflictSignature: adjustment.confirmedConflictSignature,
        },
  );
}

function cloneTransientChowSelection(selected: TransientChowSelection): TransientChowSelection {
  switch (selected.length) {
    case 0:
      return Object.freeze([]);
    case 1:
      return Object.freeze([selected[0]]);
    case 2:
      return Object.freeze([selected[0], selected[1]]);
  }
}

function cloneTransientInput(session: TransientInputSession): TransientInputSession {
  switch (session.kind) {
    case 'none':
      return NO_TRANSIENT_INPUT;
    case 'chow':
      return Object.freeze({
        kind: session.kind,
        selected: cloneTransientChowSelection(session.selected),
      });
    case 'pung':
    case 'concealed-kong':
    case 'flower':
      return Object.freeze({ kind: session.kind });
    case 'open-kong':
      return Object.freeze(
        session.openKind === undefined
          ? { kind: session.kind }
          : { kind: session.kind, openKind: session.openKind },
      );
  }
}

function cloneSource(source: CalculatorDocumentSource): CalculatorDocumentSource {
  return Object.freeze({ ...source });
}

export function createCalculatorDocument(input: CalculatorDocumentInput): CalculatorDocument {
  assertNonNegativeSafeInteger(input.schemaVersion, 'schemaVersion');

  const revision = input.revision ?? 0;
  assertNonNegativeSafeInteger(revision, 'revision');

  return Object.freeze({
    schemaVersion: input.schemaVersion,
    ruleRef: cloneRuleRef(input.ruleRef),
    hand: createHandSnapshot(input.hand),
    context: createWinContext(input.context.mode, input.context.values),
    temporaryRuleAdjustment: cloneTemporaryRuleAdjustment(input.temporaryRuleAdjustment ?? null),
    fanAdjustments: Object.freeze((input.fanAdjustments ?? []).map(cloneFanAdjustment)),
    transientInput: cloneTransientInput(input.transientInput ?? NO_TRANSIENT_INPUT),
    source: cloneSource(input.source ?? { kind: 'new' }),
    revision,
  });
}
