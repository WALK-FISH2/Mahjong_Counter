import { z } from 'zod';
import { STRUCTURE_KEYS } from '../../domain/rules/structure-definition';
import type { ResolvedPattern } from '../../domain/engine/relation/pattern-relation-resolver';
import type { FanAdjustmentState, UserAdjustedPattern } from '../../domain/engine/adjustment';
import type {
  ResultDisplaySnapshot,
  SavedResultSnapshot,
  SerializableEvaluation,
} from '../../application/examples/persistence-models';
import { ruleDataObjectSchema } from '../rule-package/rule-data-schema';
import {
  countSchema,
  fanAdjustmentSchema,
  idSchema,
  meldSchema,
  ruleRefSchema,
  tileSchema,
} from './calculator-state-schema';

const numberSchema = z.number().finite();
const decompositionSchema = z.discriminatedUnion('structureKey', [
  z.strictObject({
    structureKey: z.literal('standard-meld-pair'),
    concealedMelds: z.array(
      z.union([
        z.strictObject({
          kind: z.literal('sequence'),
          tiles: z.tuple([tileSchema, tileSchema, tileSchema]),
        }),
        z.strictObject({ kind: z.literal('triplet'), tile: tileSchema }),
      ]),
    ),
    pair: z.strictObject({ kind: z.literal('pair'), tile: tileSchema }),
    declaredMelds: z.array(meldSchema),
  }),
  z.strictObject({ structureKey: z.literal('seven-pairs'), pairs: z.array(tileSchema) }),
  z.strictObject({
    structureKey: z.literal('thirteen-orphans'),
    requiredTiles: z.array(tileSchema),
    pairTile: tileSchema,
  }),
]);
const placementSchema = z.union([
  z.strictObject({
    kind: z.enum(['pair', 'thirteen-orphans-pair', 'thirteen-orphans-single']),
    tile: tileSchema,
  }),
  z.strictObject({
    kind: z.literal('sequence'),
    meldIndex: countSchema,
    tileIndex: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  }),
  z.strictObject({ kind: z.literal('triplet'), meldIndex: countSchema }),
  z.strictObject({ kind: z.literal('seven-pairs-pair'), pairIndex: countSchema }),
]);
const recognitionCandidateSchema = z.strictObject({
  patternId: idSchema,
  recognizerKey: idSchema,
  occurrences: countSchema,
  evidence: z.array(z.strictObject({ evidenceType: idSchema, facts: ruleDataObjectSchema })),
});
const resolvedSchema = z
  .strictObject({
    candidate: recognitionCandidateSchema,
    status: z.enum(['COUNTED', 'EXCLUDED']),
    reason: z.enum([
      'COUNTED',
      'COVERED',
      'MUTEX',
      'NON_REPEAT',
      'HIGHER_SELECTED',
      'SAME_SET_ALREADY_USED',
      'FALLBACK_NOT_APPLICABLE',
    ]),
    excludedByPatternId: idSchema.optional(),
    relationType: z.enum(['covers', 'mutually-exclusive', 'non-repeat-group']).optional(),
  })
  .transform(({ excludedByPatternId, relationType, ...value }): ResolvedPattern => ({
    ...value,
    ...(excludedByPatternId === undefined ? {} : { excludedByPatternId }),
    ...(relationType === undefined ? {} : { relationType }),
  }));
const scoreItemSchema = z.strictObject({
  patternId: idSchema,
  occurrences: countSchema,
  unitValue: numberSchema,
  subtotal: numberSchema,
  unit: idSchema,
});
const extraSchema = scoreItemSchema.extend({
  extraId: idSchema,
  calculatorKey: idSchema,
  capPlacement: z.enum(['before-cap', 'after-cap']),
});
const scoreSchema = z.strictObject({
  strategyKey: idSchema,
  unit: idSchema,
  base: z.strictObject({
    strategyKey: idSchema,
    unit: idSchema,
    total: numberSchema,
    items: z.array(scoreItemSchema),
  }),
  extrasBeforeCap: z.array(extraSchema),
  extrasAfterCap: z.array(extraSchema),
  totalBeforeCap: numberSchema,
  cap: z.strictObject({
    enabled: z.boolean(),
    value: numberSchema.nullable(),
    applied: z.boolean(),
    subtotalAfterCap: numberSchema,
  }),
  total: numberSchema,
});
const legalitySchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('legal') }),
  z.strictObject({
    status: z.literal('illegal'),
    reasons: z.array(
      z.strictObject({
        reasonCode: z.literal('MINIMUM_FAN_NOT_MET'),
        data: z.strictObject({ actualFan: numberSchema, minimumFan: numberSchema }),
      }),
    ),
  }),
  z.strictObject({ status: z.literal('incomplete-context'), missingContextIds: z.array(idSchema) }),
]);
const nodeSchema = z.strictObject({
  nodeType: idSchema,
  reasonCode: idSchema,
  data: ruleDataObjectSchema,
});
const candidateSchema = z.strictObject({
  candidateId: idSchema,
  placed: z.strictObject({
    decomposition: decompositionSchema,
    winningTilePlacement: placementSchema,
  }),
  recognition: z.strictObject({
    candidates: z.array(recognitionCandidateSchema),
    unsupportedPatterns: z.array(
      z.strictObject({
        patternId: idSchema,
        reasonCode: z.literal('STRUCTURE_NOT_IMPLEMENTED'),
        structureKey: idSchema,
      }),
    ),
  }),
  relation: z.strictObject({
    counted: z.array(resolvedSchema),
    excluded: z.array(resolvedSchema),
    all: z.array(resolvedSchema),
  }),
  score: scoreSchema,
  legality: legalitySchema,
  explanation: z.strictObject({
    ruleRef: ruleRefSchema,
    structure: nodeSchema,
    patternNodes: z.array(nodeSchema),
    relationNodes: z.array(nodeSchema),
    scoringNodes: z.array(nodeSchema),
    legalityNodes: z.array(nodeSchema),
    sourceRefs: z.array(idSchema),
  }),
});
const evaluationBase = {
  ruleRef: ruleRefSchema,
  candidates: z.array(candidateSchema),
  highestLegalCandidateIds: z.array(idSchema),
  selectedCandidateId: idSchema.nullable(),
};
export const serializableEvaluationSchema = z
  .union([
    z.strictObject({
      ...evaluationBase,
      status: z.enum(['legal-win', 'structural-win-but-illegal', 'incomplete-context']),
    }),
    z.strictObject({
      ...evaluationBase,
      status: z.literal('not-winning'),
      structure: z.strictObject({
        decompositions: z.array(decompositionSchema),
        unsupportedStructures: z.array(z.enum(STRUCTURE_KEYS)),
        unavailableCapabilities: z.array(idSchema),
      }),
    }),
  ])
  .superRefine((value, ctx) => {
    const ids = new Set(value.candidates.map((candidate) => candidate.candidateId));
    if (
      ids.size !== value.candidates.length ||
      new Set(value.highestLegalCandidateIds).size !== value.highestLegalCandidateIds.length ||
      value.highestLegalCandidateIds.some(
        (id) =>
          !value.candidates.some(
            (candidate) => candidate.candidateId === id && candidate.legality.status === 'legal',
          ),
      ) ||
      (value.selectedCandidateId !== null && !ids.has(value.selectedCandidateId)) ||
      (value.status === 'legal-win' && value.highestLegalCandidateIds.length === 0)
    ) {
      ctx.addIssue({ code: 'custom', message: 'Invalid evaluation candidate references' });
    }
  }) satisfies z.ZodType<SerializableEvaluation>;

const adjustmentStateSchema = z.union([
  z
    .strictObject({
      status: z.literal('active'),
      adjustment: fanAdjustmentSchema,
      conflictSignature: idSchema.optional(),
    })
    .transform(({ conflictSignature, ...value }): FanAdjustmentState => ({
      ...value,
      ...(conflictSignature === undefined ? {} : { conflictSignature }),
    })),
  z
    .strictObject({
      status: z.literal('stale'),
      adjustment: fanAdjustmentSchema,
      reasonCode: z.enum([
        'PATTERN_NOT_RECOGNIZED',
        'TARGET_NOT_COUNTED',
        'TARGET_NOT_EXCLUDED',
        'CONFLICT_NOT_FORCE_INCLUDEABLE',
        'CONFLICT_NOT_CONFIRMED',
        'CONFLICT_CHANGED',
      ]),
      currentConflictSignature: idSchema.optional(),
    })
    .transform(({ currentConflictSignature, ...value }): FanAdjustmentState => ({
      ...value,
      ...(currentConflictSignature === undefined ? {} : { currentConflictSignature }),
    })),
]);
const adjustedPatternSchema = z
  .strictObject({
    resolved: resolvedSchema,
    displayStatus: z.enum(['COUNTED', 'EXCLUDED']),
    adjustmentAction: z.enum(['exclude', 'force-include']).optional(),
  })
  .transform(({ adjustmentAction, ...value }): UserAdjustedPattern => ({
    ...value,
    ...(adjustmentAction === undefined ? {} : { adjustmentAction }),
  }));
const userAdjustmentSchema = z.strictObject({
  baseLayer: z.enum(['preset', 'session-rule']),
  adjustments: z.array(fanAdjustmentSchema),
  result: z.strictObject({
    candidateId: idSchema,
    baseEvaluationStatus: z.enum([
      'legal-win',
      'structural-win-but-illegal',
      'not-winning',
      'incomplete-context',
    ]),
    baseLegality: legalitySchema,
    score: scoreSchema,
    patterns: z.array(adjustedPatternSchema),
    adjustmentStates: z.array(adjustmentStateSchema),
  }),
});
const displaySchema = z.strictObject({
  patterns: z.array(
    z.strictObject({
      patternId: idSchema,
      name: idSchema,
      value: z.union([numberSchema, z.string()]),
    }),
  ),
  scoring: z.strictObject({ unit: idSchema }),
  sources: z.array(
    z
      .strictObject({
        sourceId: idSchema,
        title: idSchema,
        url: z
          .url()
          .refine((url) => /^https?:\/\//u.test(url))
          .optional(),
      })
      .transform(({ url, ...source }) => ({ ...source, ...(url === undefined ? {} : { url }) })),
  ),
}) satisfies z.ZodType<ResultDisplaySnapshot>;
export const savedResultSchema = z
  .strictObject({
    documentRevision: countSchema,
    presetResult: serializableEvaluationSchema,
    sessionRuleResult: serializableEvaluationSchema.optional(),
    userAdjustedResult: userAdjustmentSchema.optional(),
    highestCandidateIds: z.array(idSchema),
    lastViewedCandidateId: idSchema.nullable(),
    lastViewedLayer: z.enum(['preset', 'session-rule', 'user-adjusted']),
    ruleRef: ruleRefSchema,
    engineVersion: idSchema,
    display: z.strictObject({
      ruleName: idSchema,
      ruleStatus: z.enum(['development', 'test', 'full']),
      ruleContentHash: idSchema,
      contextLabels: z.array(
        z.strictObject({
          contextId: idSchema,
          labelKey: idSchema,
          options: z.array(
            z.strictObject({
              value: z.union([z.boolean(), numberSchema, z.string()]),
              labelKey: idSchema,
            }),
          ),
        }),
      ),
      adjustmentLabels: z.array(z.strictObject({ adjustmentId: idSchema, labelKey: idSchema })),
      warnings: z.array(z.string()),
      preset: displaySchema,
      sessionRule: displaySchema.optional(),
    }),
  })
  .transform(
    ({ sessionRuleResult, userAdjustedResult, display, ...snapshot }): SavedResultSnapshot => ({
      ...snapshot,
      ...(sessionRuleResult === undefined ? {} : { sessionRuleResult }),
      ...(userAdjustedResult === undefined ? {} : { userAdjustedResult }),
      display: {
        ruleName: display.ruleName,
        ruleStatus: display.ruleStatus,
        ruleContentHash: display.ruleContentHash,
        warnings: display.warnings,
        contextLabels: display.contextLabels,
        adjustmentLabels: display.adjustmentLabels,
        preset: display.preset,
        ...(display.sessionRule === undefined ? {} : { sessionRule: display.sessionRule }),
      },
    }),
  );
