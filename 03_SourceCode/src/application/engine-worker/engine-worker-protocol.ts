import type { CalculatorDocument } from '../../domain/mahjong/calculator-document';
import type { SystemEvaluation } from '../../domain/engine/evaluation/evaluate-hand';
import type { DiscardToReadyResult } from '../../domain/engine/ready-analysis/discard-to-ready';
import type { WaitAnalysisResult } from '../../domain/engine/ready-analysis/wait-analysis';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';

export const ENGINE_WORKER_PROTOCOL_VERSION = 1 as const;

export type EngineWorkerOperation = 'evaluate' | 'wait-analysis' | 'discard-to-ready';

type EngineWorkerRequestBase<TOperation extends EngineWorkerOperation> = Readonly<{
  protocolVersion: typeof ENGINE_WORKER_PROTOCOL_VERSION;
  engineVersion: string;
  requestId: string;
  documentRevision: number;
  operation: TOperation;
  document: CalculatorDocument;
  rule: RulePackageDefinition;
}>;

export type EvaluateWorkerRequest = EngineWorkerRequestBase<'evaluate'>;
export type WaitAnalysisWorkerRequest = EngineWorkerRequestBase<'wait-analysis'>;
export type DiscardToReadyWorkerRequest = EngineWorkerRequestBase<'discard-to-ready'>;

export type EngineWorkerRequest =
  EvaluateWorkerRequest | WaitAnalysisWorkerRequest | DiscardToReadyWorkerRequest;

type EngineWorkerSuccessBase<TOperation extends EngineWorkerOperation, TResult> = Readonly<{
  protocolVersion: typeof ENGINE_WORKER_PROTOCOL_VERSION;
  engineVersion: string;
  requestId: string;
  documentRevision: number;
  operation: TOperation;
  status: 'success';
  result: TResult;
}>;

export type EvaluateWorkerSuccess = EngineWorkerSuccessBase<'evaluate', SystemEvaluation>;
export type WaitAnalysisWorkerSuccess = EngineWorkerSuccessBase<
  'wait-analysis',
  WaitAnalysisResult
>;
export type DiscardToReadyWorkerSuccess = EngineWorkerSuccessBase<
  'discard-to-ready',
  DiscardToReadyResult
>;

export type EngineWorkerSuccess =
  EvaluateWorkerSuccess | WaitAnalysisWorkerSuccess | DiscardToReadyWorkerSuccess;

export type EngineWorkerFailure = Readonly<{
  protocolVersion: typeof ENGINE_WORKER_PROTOCOL_VERSION;
  engineVersion: string;
  requestId: string;
  documentRevision: number;
  operation: EngineWorkerOperation;
  status: 'error';
  error: Readonly<{
    code: 'INVALID_REQUEST' | 'ENGINE_EXECUTION_FAILED';
    message: string;
  }>;
}>;

export type EngineWorkerResponse = EngineWorkerSuccess | EngineWorkerFailure;

export function createEngineWorkerRequest<TOperation extends EngineWorkerOperation>(input: {
  engineVersion: string;
  requestId: string;
  operation: TOperation;
  document: CalculatorDocument;
  rule: RulePackageDefinition;
}): Extract<EngineWorkerRequest, { operation: TOperation }> {
  return Object.freeze({
    protocolVersion: ENGINE_WORKER_PROTOCOL_VERSION,
    engineVersion: input.engineVersion,
    requestId: input.requestId,
    documentRevision: input.document.revision,
    operation: input.operation,
    document: input.document,
    rule: input.rule,
  }) as Extract<EngineWorkerRequest, { operation: TOperation }>;
}
