import { createAppStore } from '../state/create-app-store';
import type { CalculatorStore } from '../calculator/calculator-store';
import type {
  createCalculatorReplaceGuard,
  ReplaceCalculatorConfirmation,
} from '../calculator/replace-calculator';
import type { RuleRepository } from '../rules/rule-repository';
import {
  createCalculatorDocument,
  type CalculatorDocument,
} from '../../domain/mahjong/calculator-document';
import type { SavedExampleRecord } from './persistence-models';
import {
  SavedExampleError,
  type SavedExampleEntry,
  type SavedExampleRepository,
  type ClockPort,
  type IdGeneratorPort,
} from './saved-example-repository';
import { canSaveExample } from './saved-example-policy';
import {
  captureResultSnapshot,
  persistCalculator,
  restoreCalculator,
} from './saved-example-snapshot';
import { parseSavedExample } from '../../schemas/persistence/saved-example-schema';

export type SavedSession = Readonly<{
  editingOriginal: SavedExampleRecord | null;
  savedDocument: CalculatorDocument | null;
  busy: boolean;
}>;
export type SavedListQuery = Readonly<{
  search: string;
  ruleId: string;
  sort: 'modified-desc' | 'modified-asc' | 'name';
}>;

export function querySavedExamples(
  entries: readonly SavedExampleEntry[],
  query: SavedListQuery,
): readonly SavedExampleRecord[] {
  return entries
    .flatMap((entry) => (entry.status === 'available' ? [entry.record] : []))
    .filter(
      (record) =>
        record.name
          .toLocaleLowerCase('zh-CN')
          .includes(query.search.trim().toLocaleLowerCase('zh-CN')) &&
        (query.ruleId === '' || record.ruleRef.ruleId === query.ruleId),
    )
    .sort((a, b) => {
      const difference =
        query.sort === 'name'
          ? a.name.localeCompare(b.name, 'zh-CN')
          : (a.modifiedAt < b.modifiedAt ? -1 : a.modifiedAt > b.modifiedAt ? 1 : 0) *
            (query.sort === 'modified-desc' ? -1 : 1);
      return difference || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
}

export function createSavedExampleService(
  input: Readonly<{
    calculator: CalculatorStore;
    repository: SavedExampleRepository;
    rules: RuleRepository;
    replaceGuard: ReturnType<typeof createCalculatorReplaceGuard>;
    clock: ClockPort;
    ids: IdGeneratorPort;
    engineVersion: string;
    databaseSchemaVersion: number;
  }>,
) {
  const session = createAppStore<SavedSession>(() => ({
    editingOriginal: null,
    savedDocument: null,
    busy: false,
  }));
  input.calculator.subscribe((current, previous) => {
    if (current.documentEpoch !== previous.documentEpoch) {
      session.setState({ editingOriginal: null, savedDocument: null });
    }
  });

  async function save(name: string, mode: 'new' | 'update' = 'new'): Promise<SavedExampleRecord> {
    if (session.getState().busy) throw new SavedExampleError('BUSY');
    if (name.trim().length === 0 || name.length > 256) throw new SavedExampleError('INVALID_NAME');
    const state = input.calculator.getState();
    if (!canSaveExample(state)) throw new SavedExampleError('SAVE_NOT_ALLOWED');
    const original = mode === 'update' ? session.getState().editingOriginal : null;
    if (mode === 'update' && original === null) throw new SavedExampleError('RECORD_CONFLICT');
    const now = input.clock.now();
    const record = parseSavedExample({
      id: original?.id ?? input.ids.next(),
      name,
      createdAt: original?.createdAt ?? now,
      modifiedAt: now,
      calculator: persistCalculator(state.document),
      resultSnapshot: captureResultSnapshot(state, input.engineVersion),
      ruleRef: state.document.ruleRef,
      engineVersion: input.engineVersion,
      dataSchemaVersion: input.databaseSchemaVersion,
    });
    session.setState({ busy: true });
    try {
      if (original === null) await input.repository.add(record);
      else await input.repository.update(record, original);
      // Do not associate an in-flight save with a replacement document.
      if (input.calculator.getState().documentEpoch === state.documentEpoch) {
        session.setState({ editingOriginal: record, savedDocument: state.document });
      }
      return record;
    } finally {
      session.setState({ busy: false });
    }
  }
  async function edit(record: SavedExampleRecord, confirm: ReplaceCalculatorConfirmation) {
    const currentDocument = input.calculator.getState().document;
    const result = await input.replaceGuard.prepareToReplaceCalculator(
      'saved-example',
      confirm,
      async () => {
        const rulePackage = await input.rules.getInstalledRule(record.ruleRef);
        if (input.calculator.getState().document !== currentDocument)
          throw new SavedExampleError('CALCULATOR_CHANGED');
        if (rulePackage.manifest.contentHash !== record.resultSnapshot.display.ruleContentHash)
          throw new SavedExampleError('RULE_UNAVAILABLE');
        return {
          rulePackage,
          document: createCalculatorDocument({
            ...restoreCalculator(record.calculator),
            source: { kind: 'saved-example', exampleId: record.id },
            revision: input.calculator.getState().document.revision + 1,
          }),
        };
      },
    );
    if (result.status === 'replaced')
      session.setState({
        editingOriginal: record,
        savedDocument: input.calculator.getState().document,
      });
    return result;
  }
  async function discard(confirm: ReplaceCalculatorConfirmation) {
    const original = session.getState().editingOriginal;
    if (original === null) return null;
    const result = await edit(original, confirm);
    if (result.status !== 'replaced') return null;
    session.setState({ editingOriginal: null, savedDocument: null });
    return original.id;
  }
  return Object.freeze({
    session,
    save,
    edit,
    discard,
    list: () => input.repository.list(),
    get: (id: string) => input.repository.get(id),
  });
}

export type SavedExampleService = ReturnType<typeof createSavedExampleService>;
