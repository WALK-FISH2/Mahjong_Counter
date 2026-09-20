import { SHARE_FORMAT_VERSION } from '../../app/version';
import { createCalculatorDocument, type CalculatorDocument } from '../../domain/mahjong';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import { buildEffectiveRule } from '../../domain/rules/effective-rule';
import {
  getCalculatorStatus,
  getCorrectionIssues,
  type CalculatorState,
  type CalculatorStore,
} from '../calculator/calculator-store';
import type {
  createCalculatorReplaceGuard,
  ReplaceCalculatorConfirmation,
} from '../calculator/replace-calculator';
import { captureResultSnapshot } from '../examples/saved-example-snapshot';
import type { ResultDisplaySnapshot, SerializableEvaluation } from '../examples/persistence-models';
import type { RuleRepository } from '../rules/rule-repository';
import type { ReadyAnalysisOutcome, ReadyAnalysisService } from '../ready-analysis';
import { createAppStore } from '../state/create-app-store';
import {
  parseSharePayload,
  shareableCalculatorSchema,
} from '../../schemas/share/share-payload-schema';
import {
  ShareError,
  type ShareCodecPort,
  type SharePayloadV1,
  type ShareableCalculatorState,
  type ShareRuleInfo,
} from './share-models';
import { formatEvaluationText, type TextFormat } from '../result-text/result-text-formatter';

export function projectShareCalculator(document: CalculatorDocument): ShareableCalculatorState {
  return shareableCalculatorSchema.parse({
    schemaVersion: document.schemaVersion,
    ruleRef: document.ruleRef,
    hand: document.hand,
    context: document.context,
    temporaryRuleAdjustment: document.temporaryRuleAdjustment,
    fanAdjustments: document.fanAdjustments,
  });
}
function shareRule(state: CalculatorState, engineVersion: string): ShareRuleInfo {
  const m = state.rulePackage.manifest;
  if (m.status === 'development') throw new ShareError('SHARE_RULE_UNAVAILABLE');
  return { name: m.displayName, status: m.status, contentHash: m.contentHash, engineVersion };
}
function assertCompleted(state: CalculatorState): void {
  if (
    state.analysisStatus !== 'completed' ||
    state.layeredEvaluation === null ||
    state.analysisResult === null ||
    state.analysisRevision !== state.document.revision ||
    state.analysisDocument !== state.document ||
    state.document.transientInput.kind !== 'none' ||
    state.editingMeldId !== null ||
    !state.analysisAvailable ||
    getCorrectionIssues(state.document, state.rulePackage).length > 0
  )
    throw new ShareError('SHARE_UNFINISHED_OR_STALE');
}
export function captureFormalShare(state: CalculatorState, engineVersion: string): SharePayloadV1 {
  assertCompleted(state);
  if (
    !getCalculatorStatus(state).formalActionsAllowed ||
    state.analysisResult?.status === 'incomplete-context' ||
    (state.layeredEvaluation?.sessionRule?.evaluation ?? state.layeredEvaluation?.preset)
      ?.status === 'incomplete-context'
  )
    throw new ShareError('SHARE_INCOMPLETE_CONTEXT');
  const full = captureResultSnapshot(state, engineVersion);
  const displayFor = (
    evaluation: SerializableEvaluation,
    display: ResultDisplaySnapshot,
  ): ResultDisplaySnapshot => {
    const patterns = new Set(
      evaluation.candidates.flatMap((c) => c.relation.all.map((p) => p.candidate.patternId)),
    );
    const sources = new Set(evaluation.candidates.flatMap((c) => c.explanation.sourceRefs));
    return {
      ...display,
      patterns: display.patterns.filter((p) => patterns.has(p.patternId)),
      sources: display.sources.filter((s) => sources.has(s.sourceId)),
    };
  };
  // Do not ship the complete RulePackage display catalog when only a few facts are referenced.
  const snapshot = {
    ...full,
    documentRevision: 0,
    display: {
      ...full.display,
      preset: displayFor(full.presetResult, full.display.preset),
      ...(full.sessionRuleResult === undefined || full.display.sessionRule === undefined
        ? {}
        : { sessionRule: displayFor(full.sessionRuleResult, full.display.sessionRule) }),
      contextLabels: full.display.contextLabels.filter(
        (c) => c.contextId in state.document.context.values,
      ),
      adjustmentLabels: full.display.adjustmentLabels.filter(
        (a) => a.adjustmentId in (state.document.temporaryRuleAdjustment?.values ?? {}),
      ),
    },
  };
  return parseSharePayload({
    format: 'mahjong-share',
    version: SHARE_FORMAT_VERSION,
    contentType: state.analysisResult?.status === 'legal-win' ? 'legal-win' : 'cannot-win',
    calculator: projectShareCalculator(state.document),
    rule: shareRule(state, engineVersion),
    view: { layer: snapshot.lastViewedLayer, candidateId: snapshot.lastViewedCandidateId },
    resultSnapshot: { kind: 'evaluation', value: snapshot },
  });
}
export type SharePreview = Readonly<{
  payload: SharePayloadV1;
  compatibility: 'compatible' | 'read-only';
  reason: string | null;
}>;
export function createShareService(
  input: Readonly<{
    calculator: CalculatorStore;
    codec: ShareCodecPort;
    rules: RuleRepository;
    replaceGuard: ReturnType<typeof createCalculatorReplaceGuard>;
    ready: ReadyAnalysisService;
    engineVersion: string;
    canUseRule: (rule: RulePackageDefinition) => boolean;
    isEngineError: () => boolean;
  }>,
) {
  const origin = createAppStore<{ payload: SharePayloadV1 | null }>(() => ({ payload: null }));
  const previews = new WeakMap<SharePreview, RulePackageDefinition | null>();
  const issued = new WeakMap<SharePayloadV1, CalculatorState>();
  function issue(payload: SharePayloadV1) {
    issued.set(payload, input.calculator.getState());
    return payload;
  }
  input.calculator.subscribe((next, previous) => {
    if (next.documentEpoch !== previous.documentEpoch && next.document.source.kind !== 'shared')
      origin.setState({ payload: null });
  });
  async function previewPayload(raw: unknown): Promise<SharePreview> {
    const payload = parseSharePayload(raw);
    let rule: RulePackageDefinition | null = null;
    let reason: string | null = null;
    try {
      const installed = await input.rules.getInstalledRule(payload.calculator.ruleRef);
      if (
        payload.rule.engineVersion !== input.engineVersion ||
        installed.manifest.contentHash !== payload.rule.contentHash ||
        installed.manifest.status !== payload.rule.status ||
        installed.manifest.displayName !== payload.rule.name ||
        !input.canUseRule(installed)
      )
        throw new ShareError('SHARE_RULE_OR_ENGINE_INCOMPATIBLE');
      const document = createCalculatorDocument({
        ...payload.calculator,
        source: { kind: 'shared' },
        revision: 0,
      });
      buildEffectiveRule(installed, document.temporaryRuleAdjustment);
      if (
        getCorrectionIssues(document, installed).length > 0 ||
        document.fanAdjustments.some(
          (a) => !installed.patterns.some((p) => p.patternId === a.patternId),
        )
      )
        throw new ShareError('SHARE_NEEDS_CORRECTION');
      for (const [id, value] of Object.entries(document.context.values)) {
        const d = installed.contexts.find((c) => c.contextId === id);
        if (
          d === undefined ||
          (value.status === 'known' &&
            !(d.valueType === 'boolean'
              ? typeof value.value === 'boolean'
              : d.valueType === 'integer'
                ? Number.isSafeInteger(value.value)
                : d.valueType === 'text'
                  ? typeof value.value === 'string'
                  : d.options?.some((o) => o.value === value.value)))
        )
          throw new ShareError('SHARE_CONTEXT_INVALID');
      }
      rule = installed;
    } catch (error) {
      reason = error instanceof ShareError ? error.code : 'SHARE_RULE_UNAVAILABLE';
    }
    const preview: SharePreview = Object.freeze({
      payload,
      compatibility: rule === null ? 'read-only' : 'compatible',
      reason,
    });
    previews.set(preview, rule);
    return preview;
  }
  async function open(preview: SharePreview, confirm: ReplaceCalculatorConfirmation) {
    const rule = previews.get(preview);
    if (rule === undefined || rule === null) throw new ShareError('SHARE_PREVIEW_READ_ONLY');
    const result = await input.replaceGuard.prepareToReplaceCalculator('share', confirm, () => ({
      rulePackage: rule,
      document: createCalculatorDocument({
        ...preview.payload.calculator,
        source: { kind: 'shared' },
        revision: input.calculator.getState().document.revision + 1,
      }),
    }));
    // Never hydrate external results into trusted completed Calculator state.
    if (result.status === 'replaced') origin.setState({ payload: preview.payload });
    return result;
  }
  function assertEngine() {
    if (input.isEngineError()) throw new ShareError('SHARE_ENGINE_ERROR');
  }
  return Object.freeze({
    origin,
    captureFormal(mode: 'formal' | 'quick-calc' = 'formal') {
      assertEngine();
      if (mode !== 'formal') throw new ShareError('SHARE_QUICK_CALC_FORBIDDEN');
      return issue(captureFormalShare(input.calculator.getState(), input.engineVersion));
    },
    copyFormal(format: TextFormat) {
      assertEngine();
      const state = input.calculator.getState();
      assertCompleted(state);
      const snapshot = captureResultSnapshot(state, input.engineVersion);
      return formatEvaluationText(
        {
          calculator: projectShareCalculator(state.document),
          rule: shareRule(state, input.engineVersion),
          snapshot,
          layer: snapshot.lastViewedLayer,
          candidateId: snapshot.lastViewedCandidateId,
        },
        format,
      );
    },
    async captureReady(
      outcome: ReadyAnalysisOutcome,
      document: CalculatorDocument,
      ignoreWinningTile = false,
    ): Promise<SharePayloadV1> {
      assertEngine();
      const current = input.calculator.getState();
      if (
        current.document !== document ||
        current.analysisStatus === 'analyzing' ||
        !current.analysisAvailable ||
        outcome.documentRevision !== document.revision ||
        document.transientInput.kind !== 'none' ||
        current.editingMeldId !== null ||
        getCorrectionIssues(document, current.rulePackage).length > 0
      )
        throw new ShareError('SHARE_UNFINISHED_OR_STALE');
      const normalized = { ...outcome, documentRevision: 0 };
      let preset = normalized;
      const hasAdjustment = document.temporaryRuleAdjustment !== null;
      if (hasAdjustment) {
        const base = createCalculatorDocument({
          ...document,
          temporaryRuleAdjustment: null,
          fanAdjustments: [],
        });
        preset = {
          ...(await (ignoreWinningTile
            ? input.ready.analyzeDiscardIgnoringWinningTile(base, current.rulePackage)
            : input.ready.analyze(base, current.rulePackage))),
          documentRevision: 0,
        };
      }
      if (input.calculator.getState().document !== document)
        throw new ShareError('SHARE_UNFINISHED_OR_STALE');
      return issue(
        parseSharePayload({
          format: 'mahjong-share',
          version: SHARE_FORMAT_VERSION,
          contentType: 'ready-analysis',
          calculator: projectShareCalculator(document),
          rule: shareRule(current, input.engineVersion),
          view: { layer: hasAdjustment ? 'session-rule' : 'preset', candidateId: null },
          resultSnapshot: {
            kind: 'ready-analysis',
            mode: ignoreWinningTile ? 'ignore-winning-tile' : 'ordinary',
            preset,
            ...(hasAdjustment ? { sessionRule: normalized } : {}),
          },
        }),
      );
    },
    async encode(payload: SharePayloadV1, baseUrl: string) {
      assertEngine();
      const captured = issued.get(payload);
      if (captured === undefined) throw new ShareError('SHARE_UNISSUED_PAYLOAD');
      if (captured !== input.calculator.getState())
        throw new ShareError('SHARE_UNFINISHED_OR_STALE');
      const result = await input.codec.encode(payload, baseUrl);
      assertEngine();
      if (captured !== input.calculator.getState())
        throw new ShareError('SHARE_UNFINISHED_OR_STALE');
      return result;
    },
    preview: async (encoded: string) => previewPayload(await input.codec.decode(encoded)),
    open,
    async restoreOriginal(confirm: ReplaceCalculatorConfirmation) {
      const payload = origin.getState().payload;
      if (payload === null) throw new ShareError('SHARE_ORIGINAL_MISSING');
      return open(await previewPayload(payload), confirm);
    },
  });
}
export type ShareService = ReturnType<typeof createShareService>;
