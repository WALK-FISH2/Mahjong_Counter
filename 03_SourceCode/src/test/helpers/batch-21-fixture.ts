import { persistenceFixture, persistenceDocument } from './persistence-fixture';
import { createSavedExampleService } from '../../application/examples';
import { createCalculatorReplaceGuard } from '../../application/calculator/replace-calculator';
import { createStorageCapability } from '../../application/persistence/storage-capability';
import { createCommandHistory } from '../../application/persistence/command-history';
import {
  createDraftController,
  type EditorSignalPort,
} from '../../application/persistence/draft-controller';
import { DexieSavedExampleRepository } from '../../infrastructure/db/dexie-saved-example-repository';
import { DexieDraftRepository } from '../../infrastructure/db/dexie-draft-repository';
import { DexieRuleSnapshots } from '../../infrastructure/db/dexie-rule-snapshots';
import {
  createCommonSimpleRuleRepository,
  commonSimpleCapabilityRegistry,
} from '../../infrastructure/rule-repository/common-simple-rule-repository';
import { canUseHistoricalRule } from '../../application/persistence/historical-rule-compatibility';

export function batch21Fixture(document = persistenceDocument) {
  const base = persistenceFixture(document);
  const storage = createStorageCapability();
  const repository = new DexieSavedExampleRepository(base.db, storage);
  const drafts = new DexieDraftRepository(base.db, storage);
  const snapshots = new DexieRuleSnapshots(base.db, storage);
  const rules = createCommonSimpleRuleRepository();
  let id = 0;
  const nextId = () => `batch21-${++id}`;
  const service = createSavedExampleService({
    calculator: base.store,
    repository,
    trash: repository,
    snapshots,
    storage,
    rules,
    replaceGuard: createCalculatorReplaceGuard(base.store, base.drafts),
    clock: { now: () => new Date().toISOString() },
    ids: { next: nextId },
    engineVersion: '0.1.0',
    databaseSchemaVersion: 1,
    canUseRule: (rule) => canUseHistoricalRule(rule, '0.1.0', commonSimpleCapabilityRegistry),
  });
  const history = createCommandHistory(base.store);
  const signal: EditorSignalPort = {
    publish() {},
    subscribe() {
      return () => {};
    },
    close() {},
  };
  const controller = createDraftController({
    calculator: base.store,
    repository: drafts,
    rules,
    examples: service,
    storage,
    history,
    owner: nextId(),
    id: nextId,
    now: () => Date.now(),
    signal,
  });
  return {
    ...base,
    repository,
    draftRepository: drafts,
    snapshots,
    rules,
    storage,
    history,
    service,
    controller,
    async dispose() {
      await controller.dispose(false);
      history.dispose();
      await base.db.delete();
    },
  };
}
