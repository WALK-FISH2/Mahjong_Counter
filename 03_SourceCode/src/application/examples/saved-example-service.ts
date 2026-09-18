import { createAppStore } from '../state/create-app-store';
import type { CalculatorStore } from '../calculator/calculator-store';
import type {
  createCalculatorReplaceGuard,
  ReplaceCalculatorConfirmation,
} from '../calculator/replace-calculator';
import { RuleRepositoryError, type RuleRepository } from '../rules/rule-repository';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import type { RuleSnapshotPort } from '../persistence/rule-snapshot-port';
import type { StorageCapability } from '../persistence/storage-capability';
import type { TrashExampleRecord } from '../persistence/persistence-models';
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
  type TrashRepository,
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
    snapshots?: RuleSnapshotPort;
    trash?: TrashRepository;
    storage?: StorageCapability;
    canEdit?: () => boolean;
    canUseRule?: (rule: RulePackageDefinition) => boolean;
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
    input.storage?.requirePersistence();
    if (input.canEdit?.() === false) throw new SavedExampleError('SAVE_NOT_ALLOWED');
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
      const snapshot = await input.snapshots?.capture(state.rulePackage);
      if (input.canEdit?.() === false) throw new SavedExampleError('SAVE_NOT_ALLOWED');
      if (original === null) await input.repository.add(record, snapshot);
      else await input.repository.update(record, original, snapshot);
      // Do not associate an in-flight save with a replacement document.
      if (input.calculator.getState().documentEpoch === state.documentEpoch) {
        session.setState({ editingOriginal: record, savedDocument: state.document });
      }
      return record;
    } finally {
      session.setState({ busy: false });
    }
  }
  async function resolveHistoricalRule(record: SavedExampleRecord): Promise<RulePackageDefinition> {
    // Different Engine versions are not assumed equivalent without an explicit compatibility contract.
    if (record.engineVersion !== input.engineVersion)
      throw new SavedExampleError('RULE_UNAVAILABLE');
    let rule: RulePackageDefinition | null;
    try {
      rule = await input.rules.getInstalledRule(record.ruleRef);
    } catch (error) {
      if (!(error instanceof RuleRepositoryError) || error.reasonCode !== 'RULE_NOT_INSTALLED')
        throw error;
      rule = (await input.snapshots?.load(record)) ?? null;
    }
    if (
      rule === null ||
      rule.manifest.contentHash !== record.resultSnapshot.display.ruleContentHash ||
      input.canUseRule?.(rule) === false
    )
      throw new SavedExampleError('RULE_UNAVAILABLE');
    return rule;
  }
  async function edit(record: SavedExampleRecord, confirm: ReplaceCalculatorConfirmation) {
    if (input.canEdit?.() === false) throw new SavedExampleError('SAVE_NOT_ALLOWED');
    const currentDocument = input.calculator.getState().document;
    const result = await input.replaceGuard.prepareToReplaceCalculator(
      'saved-example',
      confirm,
      async () => {
        const rulePackage = await resolveHistoricalRule(record);
        if (input.canEdit?.() === false) throw new SavedExampleError('SAVE_NOT_ALLOWED');
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
    resolveHistoricalRule,
    async compatibility(record: SavedExampleRecord): Promise<'compatible' | 'read-only-legacy'> {
      try {
        await resolveHistoricalRule(record);
        return 'compatible';
      } catch {
        return 'read-only-legacy';
      }
    },
    restoreEditingOrigin(original: SavedExampleRecord | null) {
      session.setState({ editingOriginal: original, savedDocument: null });
    },
    async listTrash() {
      return input.trash?.listTrash() ?? [];
    },
    async trash(record: SavedExampleRecord) {
      if (input.trash === undefined) throw new SavedExampleError('STORAGE_UNAVAILABLE');
      await input.trash.moveToTrash(record, input.clock.now());
    },
    async restoreTrash(record: TrashExampleRecord) {
      if (input.trash === undefined) throw new SavedExampleError('STORAGE_UNAVAILABLE');
      await input.trash.restoreTrash(record);
    },
    async permanentlyDelete(record: TrashExampleRecord, confirm: () => boolean | Promise<boolean>) {
      if (!(await confirm())) return false;
      if (input.trash === undefined) throw new SavedExampleError('STORAGE_UNAVAILABLE');
      await input.trash.permanentlyDelete(record);
      return true;
    },
    list: () => input.repository.list(),
    get: (id: string) => input.repository.get(id),
  });
}

export type SavedExampleService = ReturnType<typeof createSavedExampleService>;
