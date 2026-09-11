import { z } from 'zod';
import type { SavedExampleRecord } from '../../application/examples/persistence-models';
import { calculatorStateSchema, idSchema, ruleRefSchema } from './calculator-state-schema';
import { savedResultSchema } from './saved-result-schema';

// Bounds protect one untrusted record, not the user's number of Saved Examples.
export function assertPersistenceInput(input: unknown): void {
  const seen = new Set<object>();
  let nodes = 0;
  let characters = 0;
  function visit(value: unknown, depth: number): void {
    if (++nodes > 2_000_000 || depth > 48) throw new Error('PERSISTENCE_INPUT_LIMIT');
    if (value === null || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (typeof value === 'string' && value.length <= 1_000_000) {
      characters += value.length;
      if (characters > 16_000_000) throw new Error('PERSISTENCE_INPUT_LIMIT');
      return;
    }
    if (typeof value !== 'object' || seen.has(value)) throw new Error('PERSISTENCE_INVALID_VALUE');
    seen.add(value);
    if (Array.isArray(value)) {
      value.forEach((child: unknown) => visit(child, depth + 1));
    } else {
      if (
        Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null
      )
        throw new Error('PERSISTENCE_INVALID_OBJECT');
      for (const [key, child] of Object.entries(value)) {
        if (['__proto__', 'prototype', 'constructor'].includes(key))
          throw new Error('PERSISTENCE_INVALID_KEY');
        visit(child, depth + 1);
      }
    }
    seen.delete(value);
  }
  visit(input, 0);
}

export const savedExampleSchema = z
  .strictObject({
    id: idSchema,
    name: z
      .string()
      .min(1)
      .max(256)
      .refine((name) => name.trim().length > 0),
    createdAt: z.iso.datetime(),
    modifiedAt: z.iso.datetime(),
    calculator: calculatorStateSchema,
    resultSnapshot: savedResultSchema,
    ruleRef: ruleRefSchema,
    engineVersion: idSchema,
    dataSchemaVersion: z.literal(1),
  })
  .superRefine((record, ctx) => {
    const snapshot = record.resultSnapshot;
    const calculator = record.calculator;
    const sameRef = (ref: Readonly<{ ruleId: string; ruleVersion: string }>) =>
      ref.ruleId === record.ruleRef.ruleId && ref.ruleVersion === record.ruleRef.ruleVersion;
    const actual = snapshot.sessionRuleResult ?? snapshot.presetResult;
    const viewed = snapshot.lastViewedLayer === 'preset' ? snapshot.presetResult : actual;
    const adjusted = snapshot.userAdjustedResult;
    const invalid = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (
      !sameRef(calculator.ruleRef) ||
      !sameRef(snapshot.ruleRef) ||
      !sameRef(snapshot.presetResult.ruleRef) ||
      (snapshot.sessionRuleResult !== undefined && !sameRef(snapshot.sessionRuleResult.ruleRef)) ||
      (calculator.temporaryRuleAdjustment !== null &&
        !sameRef(calculator.temporaryRuleAdjustment.baseRuleRef))
    )
      invalid('RuleRef mismatch');
    if (
      snapshot.engineVersion !== record.engineVersion ||
      snapshot.documentRevision !== calculator.revision
    )
      invalid('Result version/revision mismatch');
    if (
      actual.status !== 'legal-win' ||
      calculator.hand.winningTile === null ||
      calculator.transientInput.kind !== 'none'
    )
      invalid('Only completed legal hands can be Saved Examples');
    if (
      (calculator.temporaryRuleAdjustment !== null) !==
        (snapshot.sessionRuleResult !== undefined) ||
      (snapshot.sessionRuleResult !== undefined) !== (snapshot.display.sessionRule !== undefined)
    )
      invalid('Session rule layer mismatch');
    if (
      JSON.stringify(snapshot.highestCandidateIds) !==
      JSON.stringify(actual.highestLegalCandidateIds)
    )
      invalid('Highest candidate references mismatch');
    if (
      (snapshot.lastViewedLayer === 'session-rule' && snapshot.sessionRuleResult === undefined) ||
      (snapshot.lastViewedLayer === 'user-adjusted' && adjusted === undefined) ||
      (snapshot.lastViewedCandidateId !== null &&
        !viewed.candidates.some(
          (candidate) => candidate.candidateId === snapshot.lastViewedCandidateId,
        ))
    )
      invalid('Invalid last viewed result');
    if (calculator.fanAdjustments.length > 0 !== (adjusted !== undefined))
      invalid('User adjustment missing');
    if (adjusted !== undefined) {
      const candidate = actual.candidates.find(
        (item) => item.candidateId === adjusted.result.candidateId,
      );
      if (
        adjusted.baseLayer !==
          (snapshot.sessionRuleResult === undefined ? 'preset' : 'session-rule') ||
        JSON.stringify(adjusted.adjustments) !== JSON.stringify(calculator.fanAdjustments) ||
        candidate === undefined ||
        adjusted.result.baseEvaluationStatus !== actual.status ||
        JSON.stringify(adjusted.result.baseLegality) !== JSON.stringify(candidate?.legality)
      )
        invalid('User adjustment base mismatch');
    }
    for (const [evaluation, display] of [
      [snapshot.presetResult, snapshot.display.preset],
      [snapshot.sessionRuleResult, snapshot.display.sessionRule],
    ] as const) {
      if (evaluation === undefined || display === undefined) continue;
      const patterns = new Set(display.patterns.map((pattern) => pattern.patternId));
      const sources = new Set(display.sources.map((source) => source.sourceId));
      if (patterns.size !== display.patterns.length || sources.size !== display.sources.length)
        invalid('Duplicate display references');
      for (const candidate of evaluation.candidates) {
        if (
          !sameRef(candidate.explanation.ruleRef) ||
          candidate.relation.all.some((item) => !patterns.has(item.candidate.patternId)) ||
          candidate.explanation.sourceRefs.some((id) => !sources.has(id))
        )
          invalid('Snapshot display/reference mismatch');
      }
    }
  }) satisfies z.ZodType<SavedExampleRecord>;

export function parseSavedExample(input: unknown): SavedExampleRecord {
  assertPersistenceInput(input);
  return savedExampleSchema.parse(input);
}
