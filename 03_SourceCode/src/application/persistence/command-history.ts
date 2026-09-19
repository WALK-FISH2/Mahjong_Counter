import { createAppStore } from '../state/create-app-store';
import type { CalculatorState, CalculatorStore } from '../calculator/calculator-store';
import { createCalculatorDocument } from '../../domain/mahjong';

type Entry = Pick<CalculatorState, 'document' | 'rulePackage' | 'editingMeldId'>;
export function createCommandHistory(store: CalculatorStore, canEdit: () => boolean = () => true) {
  const state = createAppStore<{ canUndo: boolean; canRedo: boolean }>(() => ({
    canUndo: false,
    canRedo: false,
  }));
  const undo: Entry[] = [];
  const redo: Entry[] = [];
  let replaying = false;
  const update = () => state.setState({ canUndo: undo.length > 0, canRedo: redo.length > 0 });
  const capture = (value: CalculatorState): Entry => ({
    document: value.document,
    rulePackage: value.rulePackage,
    editingMeldId: value.editingMeldId,
  });
  const unsubscribe = store.subscribe((current, previous) => {
    if (replaying || current.document === previous.document) return;
    if (current.documentEpoch !== previous.documentEpoch && current.ruleSwitchUndo === null) {
      undo.length = 0;
      redo.length = 0;
      update();
      return;
    }
    undo.push(capture(previous));
    redo.length = 0;
    update();
  });
  function replay(from: Entry[], to: Entry[]): boolean {
    if (!canEdit()) return false;
    const target = from.pop();
    if (target === undefined) return false;
    const current = store.getState();
    to.push(capture(current));
    replaying = true;
    try {
      current.restoreEditor(
        target.rulePackage,
        createCalculatorDocument({ ...target.document, revision: current.document.revision + 1 }),
        target.editingMeldId,
      );
    } finally {
      replaying = false;
      update();
    }
    return true;
  }
  return {
    state,
    undo: () => replay(undo, redo),
    redo: () => replay(redo, undo),
    clear() {
      undo.length = 0;
      redo.length = 0;
      update();
    },
    dispose: unsubscribe,
    withoutHistory(action: () => void) {
      replaying = true;
      try {
        action();
      } finally {
        replaying = false;
        undo.length = 0;
        redo.length = 0;
        update();
      }
    },
  };
}
export type CommandHistory = ReturnType<typeof createCommandHistory>;
