import { createCalculatorDocument, type CalculatorDocument } from '../../domain/mahjong';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import type { CalculatorInputResult, CalculatorStore } from '../calculator/calculator-store';

export interface DraftProtectionPort {
  protectCurrentDraft(document: CalculatorDocument): Promise<void>;
}

export interface UndoPort {
  undo(): boolean;
}

export interface ClipboardPort {
  writeText(text: string): Promise<void>;
}

export type EngineErrorRecoveryState = Readonly<{
  status: 'idle' | 'error';
  issueInfo: string | null;
  draftProtected: boolean;
  copyStatus: 'idle' | 'copied' | 'manual-copy';
}>;

export type EngineErrorRecoveryService = Readonly<{
  getState: () => EngineErrorRecoveryState;
  subscribe: (listener: () => void) => () => void;
  runAnalysis: () => Promise<CalculatorInputResult>;
  retry: () => Promise<CalculatorInputResult>;
  undo: () => boolean;
  copyIssueInfo: () => Promise<boolean>;
  clear: () => void;
}>;

const IDLE_STATE: EngineErrorRecoveryState = Object.freeze({
  status: 'idle',
  issueInfo: null,
  draftProtected: false,
  copyStatus: 'idle',
});

function createIssueInfo(
  input: Readonly<{
    appVersion: string;
    engineVersion: string;
    document: CalculatorDocument;
  }>,
): string {
  return [
    'Mahjong Calculator Engine Error',
    `appVersion=${input.appVersion}`,
    `engineVersion=${input.engineVersion}`,
    `rule=${input.document.ruleRef.ruleId}@${input.document.ruleRef.ruleVersion}`,
    `documentRevision=${input.document.revision}`,
    'errorCode=ENGINE_ANALYSIS_FAILED',
  ].join('\n');
}

export function createCalculatorUndoPort(store: CalculatorStore): UndoPort {
  let previous:
    Readonly<{ document: CalculatorDocument; rulePackage: RulePackageDefinition }> | undefined;
  let restoring = false;
  store.subscribe((current, prior) => {
    if (restoring || current.document === prior.document) return;
    previous = Object.freeze({ document: prior.document, rulePackage: prior.rulePackage });
  });

  return Object.freeze({
    undo: () => {
      if (previous === undefined) return false;
      const current = store.getState();
      const target = previous;
      previous = undefined;
      restoring = true;
      try {
        store.getState().replaceCalculator(
          target.rulePackage,
          createCalculatorDocument({
            ...target.document,
            revision: current.document.revision + 1,
          }),
        );
      } finally {
        restoring = false;
      }
      return true;
    },
  });
}

export function createEngineErrorRecoveryService(
  input: Readonly<{
    store: CalculatorStore;
    draftProtectionPort: DraftProtectionPort;
    undoPort: UndoPort;
    clipboardPort: ClipboardPort;
    appVersion: string;
    engineVersion: string;
  }>,
): EngineErrorRecoveryService {
  let state = IDLE_STATE;
  const listeners = new Set<() => void>();
  const publish = (next: EngineErrorRecoveryState): void => {
    state = Object.freeze(next);
    listeners.forEach((listener) => listener());
  };

  const runAnalysis = async (): Promise<CalculatorInputResult> => {
    if (state.status === 'error') publish(IDLE_STATE);
    const result = await input.store.getState().startAnalysis();
    if (result.accepted || result.reasonCode !== 'ANALYSIS_FAILED') return result;

    const document = input.store.getState().document;
    let draftProtected: boolean;
    try {
      await input.draftProtectionPort.protectCurrentDraft(document);
      draftProtected = true;
    } catch {
      draftProtected = false;
    }
    publish({
      status: 'error',
      issueInfo: createIssueInfo({
        appVersion: input.appVersion,
        engineVersion: input.engineVersion,
        document,
      }),
      draftProtected,
      copyStatus: 'idle',
    });
    return result;
  };

  return Object.freeze({
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    runAnalysis,
    retry: runAnalysis,
    undo: () => {
      if (!input.undoPort.undo()) return false;
      publish(IDLE_STATE);
      return true;
    },
    copyIssueInfo: async () => {
      if (state.issueInfo === null) return false;
      try {
        await input.clipboardPort.writeText(state.issueInfo);
        publish({ ...state, copyStatus: 'copied' });
        return true;
      } catch {
        publish({ ...state, copyStatus: 'manual-copy' });
        return false;
      }
    },
    clear: () => publish(IDLE_STATE),
  });
}
