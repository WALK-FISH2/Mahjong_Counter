import type { CalculatorInputResult, CalculatorStore } from '../calculator/calculator-store';
import type { CalculatorDocument } from '../../domain/mahjong';

export type AnalysisLifecycleCoordinator = Readonly<{
  isAutomaticRecalculationEnabled: () => boolean;
  dispose: () => void;
}>;

function sameSerializableValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function requiresAutomaticRecalculation(
  previous: CalculatorDocument,
  current: CalculatorDocument,
): boolean {
  return (
    previous.hand.winningTile !== current.hand.winningTile ||
    !sameSerializableValue(previous.context, current.context) ||
    !sameSerializableValue(previous.temporaryRuleAdjustment, current.temporaryRuleAdjustment) ||
    !sameSerializableValue(previous.fanAdjustments, current.fanAdjustments)
  );
}

export function createAnalysisLifecycleCoordinator(
  input: Readonly<{
    store: CalculatorStore;
    runAnalysis: () => Promise<CalculatorInputResult>;
    debounceMs?: number;
  }>,
): AnalysisLifecycleCoordinator {
  let automaticRecalculationEnabled = input.store.getState().analysisResult !== null;
  let scheduled: ReturnType<typeof setTimeout> | undefined;
  let sequence = 0;

  const unsubscribe = input.store.subscribe((current, previous) => {
    if (current.analysisResult !== null) automaticRecalculationEnabled = true;
    if (
      current.document === previous.document ||
      !automaticRecalculationEnabled ||
      !requiresAutomaticRecalculation(previous.document, current.document)
    ) {
      return;
    }

    sequence += 1;
    const scheduledSequence = sequence;
    const scheduledRevision = current.document.revision;
    if (scheduled !== undefined) clearTimeout(scheduled);

    input.store.getState().invalidateAnalysis();
    scheduled = setTimeout(() => {
      scheduled = undefined;
      if (
        scheduledSequence !== sequence ||
        input.store.getState().document.revision !== scheduledRevision
      ) {
        return;
      }
      void input.runAnalysis();
    }, input.debounceMs ?? 300);
  });

  return Object.freeze({
    isAutomaticRecalculationEnabled: () => automaticRecalculationEnabled,
    dispose: () => {
      sequence += 1;
      if (scheduled !== undefined) clearTimeout(scheduled);
      scheduled = undefined;
      unsubscribe();
    },
  });
}
