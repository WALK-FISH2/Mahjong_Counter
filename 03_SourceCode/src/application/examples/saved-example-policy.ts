import { getCalculatorStatus, type CalculatorState } from '../calculator/calculator-store';

export function canSaveExample(state: CalculatorState): boolean {
  const actual =
    state.layeredEvaluation?.sessionRule?.evaluation ?? state.layeredEvaluation?.preset;
  return (
    state.analysisStatus === 'completed' &&
    state.analysisResult !== null &&
    state.analysisRevision === state.document.revision &&
    state.analysisDocument === state.document &&
    actual?.status === 'legal-win' &&
    state.document.hand.winningTile !== null &&
    state.document.transientInput.kind === 'none' &&
    state.editingMeldId === null &&
    state.rulePackage.manifest.status !== 'development' &&
    getCalculatorStatus(state).formalActionsAllowed
  );
}
