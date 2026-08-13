import { createEngineWorkerRequest, type EngineWorkerClient } from '../engine-worker';
import { buildEffectiveRule } from '../../domain/rules/effective-rule';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import {
  createCalculatorDocument,
  type CalculatorDocument,
} from '../../domain/mahjong/calculator-document';
import { createHandSnapshot } from '../../domain/mahjong/hand';
import { createWinContext, type WinMode } from '../../domain/mahjong/context';
import { countHandStructure } from '../../domain/mahjong/hand-count';
import { validateHandSnapshot } from '../../domain/mahjong/validation';
import { isContextDefinitionApplicable } from '../../domain/engine/legality';
import type { DiscardToReadyResult, WaitAnalysisResult } from '../../domain/engine/ready-analysis';

export type ReadyAnalysisKind = 'wait-analysis' | 'discard-to-ready';

type ReadyAnalysisOutcomeBase<TKind extends ReadyAnalysisKind, TResult> = Readonly<{
  kind: TKind;
  documentRevision: number;
  primaryMode: WinMode;
  alternateMode: WinMode;
  primary: TResult;
  alternate: TResult;
}>;

export type WaitAnalysisOutcome = ReadyAnalysisOutcomeBase<'wait-analysis', WaitAnalysisResult>;
export type DiscardToReadyOutcome = ReadyAnalysisOutcomeBase<
  'discard-to-ready',
  DiscardToReadyResult
>;
export type ReadyAnalysisOutcome = WaitAnalysisOutcome | DiscardToReadyOutcome;

export interface ReadyAnalysisService {
  getKind(document: CalculatorDocument, rule: RulePackageDefinition): ReadyAnalysisKind | null;
  analyze(document: CalculatorDocument, rule: RulePackageDefinition): Promise<ReadyAnalysisOutcome>;
  analyzeDiscardIgnoringWinningTile(
    document: CalculatorDocument,
    rule: RulePackageDefinition,
  ): Promise<DiscardToReadyOutcome>;
  cancel(): void;
}

function alternateMode(mode: WinMode): WinMode {
  return mode === 'discard' ? 'self-draw' : 'discard';
}

function withMode(
  document: CalculatorDocument,
  mode: WinMode,
  rule: RulePackageDefinition,
): CalculatorDocument {
  const targetContext = createWinContext(mode, document.context.values);
  const values = Object.fromEntries(
    Object.entries(document.context.values).filter(([contextId]) => {
      const definition = rule.contexts.find((candidate) => candidate.contextId === contextId);
      return definition === undefined || isContextDefinitionApplicable(definition, targetContext);
    }),
  );
  return createCalculatorDocument({
    ...document,
    context: createWinContext(mode, values),
  });
}

export function getReadyAnalysisKind(
  document: CalculatorDocument,
  rule: RulePackageDefinition,
): ReadyAnalysisKind | null {
  if (document.hand.winningTile !== null || document.transientInput.kind !== 'none') return null;
  if (!validateHandSnapshot(document.hand, rule.tileSet).isValid) return null;

  const structuralTileCount = countHandStructure(document.hand).structuralTileCount;
  if (structuralTileCount === rule.handModel.readyStructuralTileCount) return 'wait-analysis';
  if (structuralTileCount === rule.handModel.targetStructuralTileCount) return 'discard-to-ready';
  return null;
}

export function createReadyAnalysisService(
  input: Readonly<{
    client: EngineWorkerClient;
    engineVersion: string;
    getCurrentDocumentRevision: () => number;
  }>,
): ReadyAnalysisService {
  let requestSequence = 0;

  const execute = async <TKind extends ReadyAnalysisKind>(
    operation: TKind,
    document: CalculatorDocument,
    rule: RulePackageDefinition,
  ) => {
    requestSequence += 1;
    const response = await input.client.execute(
      createEngineWorkerRequest({
        engineVersion: input.engineVersion,
        requestId: `ready-${operation}-${requestSequence}`,
        operation,
        document,
        rule,
      }),
      input.getCurrentDocumentRevision,
    );
    if (response.operation !== operation) {
      throw new Error('Engine Worker returned a mismatched ready-analysis response.');
    }
    return response.result;
  };

  const analyzeReadyDocument = async (
    document: CalculatorDocument,
    rule: RulePackageDefinition,
  ): Promise<ReadyAnalysisOutcome> => {
    const effectiveRule = buildEffectiveRule(rule, document.temporaryRuleAdjustment);
    const kind = getReadyAnalysisKind(document, effectiveRule);
    if (kind === null)
      throw new Error('Current CalculatorDocument is not ready for ready analysis.');

    const secondaryMode = alternateMode(document.context.mode);
    const [primary, alternate] = await Promise.all([
      execute(kind, document, effectiveRule),
      execute(kind, withMode(document, secondaryMode, effectiveRule), effectiveRule),
    ]);

    return Object.freeze({
      kind,
      documentRevision: document.revision,
      primaryMode: document.context.mode,
      alternateMode: secondaryMode,
      primary,
      alternate,
    }) as ReadyAnalysisOutcome;
  };

  const service: ReadyAnalysisService = {
    getKind: (document: CalculatorDocument, rule: RulePackageDefinition) =>
      getReadyAnalysisKind(document, buildEffectiveRule(rule, document.temporaryRuleAdjustment)),
    analyze: analyzeReadyDocument,
    analyzeDiscardIgnoringWinningTile: async (document, rule) => {
      if (document.hand.winningTile === null) {
        throw new Error('A legal winning tile is required before continuing discard analysis.');
      }
      const analysisDocument = createCalculatorDocument({
        ...document,
        hand: createHandSnapshot({
          ...document.hand,
          concealed: [...document.hand.concealed, document.hand.winningTile],
          winningTile: null,
        }),
      });
      const outcome = await analyzeReadyDocument(analysisDocument, rule);
      if (outcome.kind !== 'discard-to-ready') {
        throw new Error('The legal winning hand did not produce discard analysis input.');
      }
      return outcome;
    },
    cancel: () => input.client.cancelAndRebuild(),
  };
  return Object.freeze(service);
}
