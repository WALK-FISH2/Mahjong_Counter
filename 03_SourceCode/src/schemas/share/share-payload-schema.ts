import { z } from 'zod';
import { createHandSnapshot } from '../../domain/mahjong';
import { placeWinningTile } from '../../domain/engine/structure/winning-tile-placement';
import { SHARE_FORMAT_VERSION } from '../../app/version';
import type { SharePayloadV1 } from '../../application/share/share-models';
import {
  calculatorStateSchema,
  tileSchema,
  idSchema,
} from '../persistence/calculator-state-schema';
import {
  savedResultSchema,
  serializableEvaluationSchema,
  candidateSchema,
} from '../persistence/saved-result-schema';
import { assertShareResources } from './share-input-limits';

export const shareableCalculatorSchema = calculatorStateSchema.omit({
  source: true,
  revision: true,
  transientInput: true,
});
const legalWait = z.strictObject({
  tile: tileSchema,
  status: z.literal('legal'),
  best: candidateSchema,
  highestLegalCandidates: z.array(candidateSchema),
});
const waitSchema = z
  .strictObject({
    candidates: z.array(
      z.union([
        legalWait,
        z.strictObject({
          tile: tileSchema,
          status: z.literal('pending-context'),
          evaluation: serializableEvaluationSchema,
        }),
        z.strictObject({
          tile: tileSchema,
          status: z.literal('structural-only'),
          reasons: z.array(
            z.strictObject({
              reasonCode: z.literal('MINIMUM_FAN_NOT_MET'),
              data: z.strictObject({
                actualFan: z.number().finite(),
                minimumFan: z.number().finite(),
              }),
            }),
          ),
        }),
      ]),
    ),
    legalWaitCount: z.number().int().nonnegative(),
  })
  .superRefine((value, ctx) => {
    if (
      new Set(value.candidates.map((c) => c.tile)).size !== value.candidates.length ||
      value.legalWaitCount !== value.candidates.filter((c) => c.status === 'legal').length
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid wait references/count' });
    for (const candidate of value.candidates) {
      if (
        candidate.status === 'legal' &&
        (candidate.best.legality.status !== 'legal' ||
          candidate.highestLegalCandidates.some((c) => c.legality.status !== 'legal') ||
          !candidate.highestLegalCandidates.some(
            (c) => c.candidateId === candidate.best.candidateId,
          ) ||
          new Set(candidate.highestLegalCandidates.map((c) => c.candidateId)).size !==
            candidate.highestLegalCandidates.length)
      )
        ctx.addIssue({ code: 'custom', message: 'Invalid legal wait' });
      if (
        candidate.status === 'pending-context' &&
        candidate.evaluation.status !== 'incomplete-context'
      )
        ctx.addIssue({ code: 'custom', message: 'Invalid pending wait' });
    }
  });
const discardSchema = z
  .strictObject({ candidates: z.array(z.strictObject({ discard: tileSchema, waits: waitSchema })) })
  .superRefine((v, ctx) => {
    if (new Set(v.candidates.map((c) => c.discard)).size !== v.candidates.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate discard' });
  });
const outcomeBase = {
  documentRevision: z.literal(0),
  primaryMode: z.enum(['discard', 'self-draw']),
  alternateMode: z.enum(['discard', 'self-draw']),
};
const readySchema = z
  .union([
    z.strictObject({
      ...outcomeBase,
      kind: z.literal('wait-analysis'),
      primary: waitSchema,
      alternate: waitSchema,
    }),
    z.strictObject({
      ...outcomeBase,
      kind: z.literal('discard-to-ready'),
      primary: discardSchema,
      alternate: discardSchema,
    }),
  ])
  .superRefine((v, ctx) => {
    if (v.primaryMode === v.alternateMode)
      ctx.addIssue({ code: 'custom', message: 'Invalid modes' });
  });

export const sharePayloadSchema = z
  .strictObject({
    format: z.literal('mahjong-share'),
    version: z.literal(SHARE_FORMAT_VERSION),
    contentType: z.enum(['legal-win', 'cannot-win', 'ready-analysis']),
    calculator: shareableCalculatorSchema,
    rule: z.strictObject({
      name: idSchema,
      status: z.enum(['test', 'full']),
      contentHash: z.string().regex(/^[a-f0-9]{64}$/u),
      engineVersion: idSchema,
    }),
    view: z.strictObject({
      layer: z.enum(['preset', 'session-rule', 'user-adjusted']),
      candidateId: idSchema.nullable(),
    }),
    resultSnapshot: z.union([
      z.strictObject({ kind: z.literal('evaluation'), value: savedResultSchema }),
      z.strictObject({
        kind: z.literal('ready-analysis'),
        mode: z.enum(['ordinary', 'ignore-winning-tile']),
        preset: readySchema,
        sessionRule: readySchema.optional(),
      }),
    ]),
  })
  .superRefine((p, ctx) => {
    const bad = (message: string) => ctx.addIssue({ code: 'custom', message });
    const same = (ref: { ruleId: string; ruleVersion: string }) =>
      ref.ruleId === p.calculator.ruleRef.ruleId &&
      ref.ruleVersion === p.calculator.ruleRef.ruleVersion;
    if (
      p.calculator.temporaryRuleAdjustment !== null &&
      !same(p.calculator.temporaryRuleAdjustment.baseRuleRef)
    )
      bad('Adjustment RuleRef mismatch');
    const r = p.resultSnapshot;
    if (r.kind === 'ready-analysis') {
      if (
        p.contentType !== 'ready-analysis' ||
        p.view.layer === 'user-adjusted' ||
        p.view.candidateId !== null
      )
        bad('Ready type/layer mismatch');
      if (
        (p.calculator.temporaryRuleAdjustment !== null) !== (r.sessionRule !== undefined) ||
        (p.view.layer === 'session-rule' && r.sessionRule === undefined)
      )
        bad('Ready layer mismatch');
      if (
        r.preset.primaryMode !== p.calculator.context.mode ||
        (r.sessionRule !== undefined &&
          (r.sessionRule.kind !== r.preset.kind ||
            r.sessionRule.primaryMode !== r.preset.primaryMode))
      )
        bad('Ready mode mismatch');
      if (
        (p.calculator.hand.winningTile !== null) !== (r.mode === 'ignore-winning-tile') ||
        (r.mode === 'ignore-winning-tile' && r.preset.kind !== 'discard-to-ready')
      )
        bad('Ready input mismatch');
      for (const outcome of [r.preset, r.sessionRule]) {
        if (outcome === undefined) continue;
        const waits =
          outcome.kind === 'wait-analysis'
            ? [outcome.primary, outcome.alternate]
            : [...outcome.primary.candidates, ...outcome.alternate.candidates].map((c) => c.waits);
        for (const wait of waits)
          for (const candidate of wait.candidates) {
            const candidates =
              candidate.status === 'legal'
                ? [candidate.best, ...candidate.highestLegalCandidates]
                : candidate.status === 'pending-context'
                  ? candidate.evaluation.candidates
                  : [];
            if (candidate.status === 'pending-context' && !same(candidate.evaluation.ruleRef))
              bad('Ready RuleRef mismatch');
            if (
              candidates.some(
                (c) =>
                  !same(c.explanation.ruleRef) ||
                  !placeWinningTile(createHandSnapshot({ winningTile: candidate.tile }), [
                    c.placed.decomposition,
                  ]).some(
                    (p) =>
                      JSON.stringify(p.winningTilePlacement) ===
                      JSON.stringify(c.placed.winningTilePlacement),
                  ),
              )
            )
              bad('Ready candidate reference mismatch');
          }
      }
      return;
    }
    const s = r.value;
    const actual = s.sessionRuleResult ?? s.presetResult;
    const viewed = p.view.layer === 'preset' ? s.presetResult : actual;
    if (
      p.contentType === 'ready-analysis' ||
      viewed.status === 'incomplete-context' ||
      actual.status === 'incomplete-context' ||
      p.contentType !== (viewed.status === 'legal-win' ? 'legal-win' : 'cannot-win')
    )
      bad('Content type mismatch');
    if (p.calculator.hand.winningTile === null) bad('Missing winning tile');
    if (
      !same(s.ruleRef) ||
      !same(s.presetResult.ruleRef) ||
      (s.sessionRuleResult !== undefined && !same(s.sessionRuleResult.ruleRef))
    )
      bad('Snapshot RuleRef mismatch');
    if (
      s.engineVersion !== p.rule.engineVersion ||
      s.display.ruleContentHash !== p.rule.contentHash ||
      s.display.ruleName !== p.rule.name ||
      s.display.ruleStatus !== p.rule.status ||
      s.documentRevision !== 0
    )
      bad('Snapshot metadata mismatch');
    if (
      (p.calculator.temporaryRuleAdjustment !== null) !== (s.sessionRuleResult !== undefined) ||
      (s.sessionRuleResult !== undefined) !== (s.display.sessionRule !== undefined)
    )
      bad('Session layer mismatch');
    if (
      p.view.layer !== s.lastViewedLayer ||
      p.view.candidateId !== s.lastViewedCandidateId ||
      (p.view.layer === 'session-rule' && s.sessionRuleResult === undefined) ||
      (p.view.layer === 'user-adjusted' && s.userAdjustedResult === undefined) ||
      (viewed.status === 'legal-win' && p.view.candidateId === null) ||
      (p.view.candidateId !== null &&
        !viewed.candidates.some((c) => c.candidateId === p.view.candidateId)) ||
      JSON.stringify(s.highestCandidateIds) !== JSON.stringify(actual.highestLegalCandidateIds)
    )
      bad('Candidate/layer reference mismatch');
    const adjusted = s.userAdjustedResult;
    if (p.calculator.fanAdjustments.length > 0 !== (adjusted !== undefined))
      bad('Missing adjustment');
    if (adjusted !== undefined) {
      const base = actual.candidates.find((c) => c.candidateId === adjusted.result.candidateId);
      if (
        base === undefined ||
        (p.view.layer === 'user-adjusted' && p.view.candidateId !== adjusted.result.candidateId) ||
        adjusted.baseLayer !== (s.sessionRuleResult === undefined ? 'preset' : 'session-rule') ||
        adjusted.result.baseEvaluationStatus !== actual.status ||
        JSON.stringify(adjusted.adjustments) !== JSON.stringify(p.calculator.fanAdjustments) ||
        JSON.stringify(adjusted.result.baseLegality) !== JSON.stringify(base?.legality)
      )
        bad('Adjustment base mismatch');
    }
    for (const [evaluation, display] of [
      [s.presetResult, s.display.preset],
      [s.sessionRuleResult, s.display.sessionRule],
    ] as const) {
      if (evaluation === undefined || display === undefined) continue;
      const patterns = new Set(display.patterns.map((p) => p.patternId));
      const sources = new Set(display.sources.map((s) => s.sourceId));
      for (const c of evaluation.candidates)
        if (
          !same(c.explanation.ruleRef) ||
          c.relation.all.some((p) => !patterns.has(p.candidate.patternId)) ||
          c.explanation.sourceRefs.some((s) => !sources.has(s))
        )
          bad('Display reference mismatch');
    }
  });

export function parseSharePayload(input: unknown): SharePayloadV1 {
  assertShareResources(input);
  const p = sharePayloadSchema.parse(input);
  if (p.resultSnapshot.kind === 'ready-analysis') {
    const { sessionRule, ...snapshot } = p.resultSnapshot;
    const result = {
      ...p,
      resultSnapshot: { ...snapshot, ...(sessionRule === undefined ? {} : { sessionRule }) },
    };
    freezeSnapshot(result);
    return result;
  }
  const result = { ...p, resultSnapshot: p.resultSnapshot };
  freezeSnapshot(result);
  return result;
}
function freezeSnapshot(value: unknown): void {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(freezeSnapshot);
    Object.freeze(value);
  }
}
