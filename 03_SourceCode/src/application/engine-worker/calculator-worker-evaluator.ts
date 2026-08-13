import type { CalculatorEvaluator } from '../calculator/calculator-store';
import type { EngineWorkerClient } from './engine-worker-client';
import { createEngineWorkerRequest } from './engine-worker-protocol';

export function createWorkerCalculatorEvaluator(
  input: Readonly<{
    client: EngineWorkerClient;
    engineVersion: string;
    getCurrentDocumentRevision: () => number;
  }>,
): CalculatorEvaluator {
  let requestSequence = 0;
  const evaluator: CalculatorEvaluator = async (document, rule) => {
    requestSequence += 1;
    const response = await input.client.execute(
      createEngineWorkerRequest({
        engineVersion: input.engineVersion,
        requestId: `evaluate-${requestSequence}`,
        operation: 'evaluate',
        document,
        rule,
      }),
      input.getCurrentDocumentRevision,
    );
    if (response.operation !== 'evaluate') {
      throw new Error('Engine Worker returned a mismatched operation response.');
    }
    return response.result;
  };
  evaluator.cancel = () => input.client.cancelAndRebuild();
  return evaluator;
}
