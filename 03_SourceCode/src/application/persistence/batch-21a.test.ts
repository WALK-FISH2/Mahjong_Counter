import { afterEach, describe, expect, it, vi } from 'vitest';
import Dexie from 'dexie';
import { IDBFactory, IDBKeyRange, IDBObjectStore } from 'fake-indexeddb';
import {
  LocalPreferences,
  PREFERENCES_KEY,
  type PreferenceStorage,
} from '../../infrastructure/preferences/local-preferences';
import {
  DEFAULT_CALCULATOR_PREFERENCES,
  consumeOnboarding,
  recordRecentlyUsedRule,
  replayOnboarding,
  setWaitSortMode,
} from '../preferences';
import { batch21Fixture } from '../../test/helpers/batch-21-fixture';
import {
  createCalculatorReplaceGuard,
  CALCULATOR_REPLACEMENT_REASONS,
  createNewHandReplacement,
} from '../calculator/replace-calculator';
import { createEngineErrorRecoveryService } from '../analysis-lifecycle';
import {
  DATABASE_MIGRATIONS,
  DexieMigration,
  type MigrationStep,
} from '../../infrastructure/db/dexie-migration';
import { createDatabaseMigrationService } from './database-migration';
import { DATABASE_STORES } from '../../infrastructure/db/mahjong-database';
import { createLocalDataManagement, describeStorage } from './local-data-management';
import { DexieLocalData } from '../../infrastructure/db/dexie-local-data';
import { createStorageCapability } from './storage-capability';
import { parseDraftRecord } from '../../schemas/persistence/batch-21-schema';
import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import { createCalculatorDocument } from '../../domain/mahjong';

function memoryStorage(): PreferenceStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}
const fixtures: ReturnType<typeof batch21Fixture>[] = [];
const databases: Dexie[] = [];
function fixture() {
  const f = batch21Fixture();
  fixtures.push(f);
  return f;
}
afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await Promise.all(fixtures.splice(0).map((f) => f.dispose()));
  await Promise.all(databases.splice(0).map((db) => db.delete()));
});

describe('T915 typed lightweight preferences', () => {
  it('roundtrips all preferences and unifies recent rules, onboarding and Settings', async () => {
    const storage = memoryStorage();
    const port = new LocalPreferences(() => storage);
    expect(await port.read()).toEqual(DEFAULT_CALCULATOR_PREFERENCES);
    await port.write({
      ...DEFAULT_CALCULATOR_PREFERENCES,
      theme: 'dark',
      motion: 'reduced',
      defaultCopyFormat: 'detailed',
      autoUpdateCheckEnabled: false,
      pwaPromptState: 'dismissed',
      lastUpdateCheckAt: '2026-09-18T00:00:00.000Z',
    });
    await recordRecentlyUsedRule(port, { ruleId: 'data-driven', ruleVersion: '2' });
    await recordRecentlyUsedRule(port, commonSimpleRulePackage.manifest);
    expect((await port.read()).lastRuleRef).toEqual({
      ruleId: commonSimpleRulePackage.manifest.ruleId,
      ruleVersion: commonSimpleRulePackage.manifest.ruleVersion,
    });
    await setWaitSortMode(port, 'wait-count');
    await consumeOnboarding(port);
    const reopened = new LocalPreferences(() => storage);
    expect(await reopened.read()).toEqual(await port.read());
    expect(await consumeOnboarding(reopened)).toEqual({
      showRuleNotice: false,
      showInputGuide: false,
    });
    await replayOnboarding(reopened);
    expect((await reopened.read()).inputGuideSeen).toBe(false);
    expect(port.raw()).not.toMatch(/concealed|hand|draft|resultSnapshot/);
  });
  it.each([
    '{broken',
    '{"version":99,"preferences":{}}',
    '{"version":2,"preferences":{"hand":[]}}',
  ])('retains damaged/future data %s until explicit reset', async (raw) => {
    const storage = memoryStorage();
    storage.setItem(PREFERENCES_KEY, raw);
    const port = new LocalPreferences(() => storage);
    expect(await port.read()).toEqual(DEFAULT_CALCULATOR_PREFERENCES);
    expect(port.state.getState().warning).not.toBeNull();
    await consumeOnboarding(port);
    expect(port.raw()).toBe(raw);
    port.reset();
    await setWaitSortMode(port, 'wait-count');
    expect(port.state.getState().warning).toBeNull();
    expect((await new LocalPreferences(() => storage).read()).waitSortMode).toBe('wait-count');
  });
  it('migrates v1 preferences without importing unknown fields or hand data', async () => {
    const storage = memoryStorage();
    storage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        version: 1,
        preferences: {
          lastRuleRef: null,
          recentRuleRefs: [],
          ruleNoticeSeen: true,
          inputGuideSeen: true,
          waitSortMode: 'wait-count',
          testingRuleConfirmations: {},
        },
      }),
    );
    const port = new LocalPreferences(() => storage);
    expect(await port.read()).toEqual({
      ...DEFAULT_CALCULATOR_PREFERENCES,
      ruleNoticeSeen: true,
      inputGuideSeen: true,
      waitSortMode: 'wait-count',
    });
    await port.write(await port.read());
    expect(port.raw()).toContain('"version":2');
  });
  it('keeps session settings usable but reports localStorage failures', async () => {
    const storage = memoryStorage();
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const port = new LocalPreferences(() => storage);
    await setWaitSortMode(port, 'wait-count');
    expect((await port.read()).waitSortMode).toBe('wait-count');
    expect(port.state.getState().warning).toContain('写入失败');
  });
});

describe('T916 real Draft protection', () => {
  it.each(CALCULATOR_REPLACEMENT_REASONS)(
    '%s persists current input before confirmation; cancellation retains it',
    async (reason) => {
      const f = fixture();
      await f.controller.start();
      f.store.getState().setWinningTile('green');
      const before = f.store.getState().document;
      const guard = createCalculatorReplaceGuard(
        f.store,
        { protectBeforeReplacement: f.controller.protectCurrentDraft },
        f.controller.canEdit,
      );
      const result = await guard.prepareToReplaceCalculator(
        reason,
        async () => {
          expect((await f.draftRepository.read())?.calculator).toEqual(before);
          return false;
        },
        () => createNewHandReplacement(f.store.getState().rulePackage),
      );
      expect(result.status).toBe('cancelled');
      expect(f.store.getState().document).toBe(before);
      f.db.close();
      await f.db.open();
      expect((await f.draftRepository.read())?.calculator).toEqual(before);
      expect(f.history.undo()).toBe(true);
      await f.controller.flush();
      expect((await f.draftRepository.read())?.calculator.hand.winningTile).toBe('white');
    },
  );
  it.each(CALCULATOR_REPLACEMENT_REASONS)(
    '%s rejects failed persistent protection and does not confirm or replace',
    async (reason) => {
      const f = fixture();
      await f.controller.start();
      f.store.getState().setWinningTile('green');
      const original = f.store.getState().document;
      vi.spyOn(f.db.draft, 'put').mockRejectedValueOnce(
        new DOMException('full', 'QuotaExceededError'),
      );
      const guard = createCalculatorReplaceGuard(
        f.store,
        { protectBeforeReplacement: f.controller.protectCurrentDraft },
        f.controller.canEdit,
      );
      const confirm = vi.fn(() => true);
      expect(
        (
          await guard.prepareToReplaceCalculator(reason, confirm, () =>
            createNewHandReplacement(f.store.getState().rulePackage),
          )
        ).status,
      ).toBe('draft-protection-failed');
      expect(confirm).not.toHaveBeenCalled();
      expect(f.store.getState().document).toBe(original);
      expect(f.storage.state.getState().mode).toBe('temporary');
    },
  );
  it('does not replace input changed while confirmation awaits', async () => {
    const f = fixture();
    await f.controller.start();
    const guard = createCalculatorReplaceGuard(f.store, {
      protectBeforeReplacement: f.controller.protectCurrentDraft,
    });
    expect(
      (
        await guard.prepareToReplaceCalculator(
          'new-hand',
          () => {
            f.store.getState().setWinningTile('green');
            return true;
          },
          () => createNewHandReplacement(f.store.getState().rulePackage),
        )
      ).status,
    ).toBe('draft-protection-failed');
    expect(f.store.getState().document.hand.winningTile).toBe('green');
  });
  it('Engine Error uses persistent protection and the same Command History; failed protection blocks undo', async () => {
    const f = fixture();
    await f.controller.start();
    f.store.getState().setWinningTile('green');
    vi.spyOn(f.store.getState(), 'startAnalysis').mockResolvedValue({
      accepted: false,
      reasonCode: 'ANALYSIS_FAILED',
    });
    const recovery = createEngineErrorRecoveryService({
      store: f.store,
      draftProtectionPort: f.controller,
      undoPort: f.history,
      clipboardPort: { writeText: async () => {} },
      appVersion: '0',
      engineVersion: '0',
    });
    await recovery.runAnalysis();
    expect(recovery.getState().draftProtected).toBe(true);
    expect((await f.draftRepository.read())?.calculator.hand.winningTile).toBe('green');
    expect(recovery.undo()).toBe(true);
    expect(f.store.getState().document.hand.winningTile).toBe('white');
    f.storage.preserveReadOnly('MIGRATION_FAILED');
    await recovery.runAnalysis();
    expect(recovery.getState().draftProtected).toBe(false);
    expect(recovery.undo()).toBe(false);
  });
});

describe('T917 Saved state, modifiedAt and approximate capacity', () => {
  it.each(['rename-and-save', 'content-overwrite', 'new-rule-overwrite'])(
    '%s is an explicit write that updates modifiedAt and keeps the record ID',
    async (operation) => {
      const f = fixture();
      await f.store.getState().startAnalysis();
      const original = await f.service.save('write matrix');
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2027-01-01T00:00:00.000Z'));
      if (operation === 'new-rule-overwrite') {
        // Synthetic version fixture: exercises the existing explicit overwrite port, not an updater.
        const rule = {
          ...commonSimpleRulePackage,
          manifest: {
            ...commonSimpleRulePackage.manifest,
            ruleVersion: '1.0.1',
            contentHash: 'a'.repeat(64),
          },
        };
        const current = f.store.getState().document;
        f.store.getState().restoreEditor(
          rule,
          createCalculatorDocument({
            ...current,
            ruleRef: { ruleId: rule.manifest.ruleId, ruleVersion: rule.manifest.ruleVersion },
            revision: current.revision + 1,
          }),
          null,
        );
      } else if (operation === 'content-overwrite') {
        f.store.getState().applyTemporaryRuleAdjustment({ minimumFan: 1 });
      }
      let updated: typeof original;
      if (operation === 'rename-and-save') updated = await f.service.rename(original, 'new name');
      else {
        await f.store.getState().startAnalysis();
        updated = await f.service.save(original.name, 'update');
      }
      expect(updated.id).toBe(original.id);
      expect(updated.createdAt).toBe(original.createdAt);
      expect(updated.modifiedAt).toBe('2027-01-01T00:00:00.000Z');
      expect(updated.modifiedAt).not.toBe(original.modifiedAt);
      expect(await f.service.get(original.id)).toEqual(updated);
    },
  );
  it('owns SAVED / MODIFIED_AFTER_SAVE transitions, never guesses in UI', async () => {
    const f = fixture();
    await f.store.getState().startAnalysis();
    await f.service.save('status');
    expect(f.service.session.getState().status).toBe('SAVED');
    f.store.getState().setWinningTile('green');
    expect(f.service.session.getState().status).toBe('MODIFIED_AFTER_SAVE');
    f.history.undo();
    expect(f.service.session.getState().status).toBe('MODIFIED_AFTER_SAVE');
  });
  it.each(['read-only', 'browse-result', 'copy-share-read', 'trash-restore'])(
    '%s does not mutate modifiedAt or record facts',
    async (action) => {
      const f = fixture();
      await f.store.getState().startAnalysis();
      const saved = await f.service.save('time');
      if (action === 'trash-restore') {
        await f.service.trash(saved);
        const entry = (await f.service.listTrash())[0]!;
        if (entry.status !== 'available') throw new Error('missing');
        await f.service.restoreTrash(entry.record);
      } else {
        const loaded = await f.service.get(saved.id);
        expect(loaded?.resultSnapshot.highestCandidateIds).toEqual(
          saved.resultSnapshot.highestCandidateIds,
        );
      }
      expect(await f.service.get(saved.id)).toEqual(saved);
    },
  );
  it('rename is an explicit CAS write and stale concurrent rename cannot overwrite', async () => {
    const f = fixture();
    await f.store.getState().startAnalysis();
    const saved = await f.service.save('old');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-01-01T00:00:00Z'));
    const renamed = await f.service.rename(saved, 'new');
    vi.useRealTimers();
    expect(renamed.modifiedAt).not.toBe(saved.modifiedAt);
    expect(renamed.calculator).toEqual(saved.calculator);
    await expect(f.service.rename(saved, 'stale')).rejects.toMatchObject({
      code: 'RECORD_CONFLICT',
    });
  });
  it('capacity is approximate, optional, and quota advice is not a count cap', () => {
    expect(describeStorage({ usage: 900, quota: 1000 })).toMatchObject({ tight: true });
    expect(describeStorage({ usage: 1, quota: 1000 }).description).toContain('约');
    expect(describeStorage({ usage: null, quota: null })).toEqual({
      description: '浏览器未提供占用估算',
      tight: false,
    });
  });
});

async function legacyDatabase() {
  const options = { indexedDB: new IDBFactory(), IDBKeyRange };
  const db = new Dexie('migration-test', options);
  db.version(1).stores(DATABASE_STORES);
  await db.open();
  const f = fixture();
  await f.store.getState().startAnalysis();
  const saved = await f.service.save('old data');
  await f.controller.start();
  await f.controller.flush();
  await db.table('savedExamples').add(saved);
  const draft = parseDraftRecord(await f.db.draft.get('current'));
  const snapshots = await f.db.ruleSnapshots.toArray();
  const trash = { ...saved, id: 'old-trash', trashedAt: saved.modifiedAt };
  await db.table('draft').add(draft);
  await db.table('trashExamples').add(trash);
  await db.table('ruleSnapshots').bulkAdd(snapshots);
  await db.table('migrationBackups').add({ id: 'older-backup', data: 'preserved' });
  db.close();
  databases.push(db);
  const migration = (
    steps: readonly MigrationStep[] = DATABASE_MIGRATIONS,
    preferencesRaw = () => 'old-settings',
  ) =>
    new DexieMigration({
      name: db.name,
      options,
      preferencesRaw,
      id: () => 'backup',
      now: () => '2026-09-18T00:00:00.000Z',
      steps,
    });
  const open = async () => {
    const current = new Dexie(db.name, options);
    await current.open();
    databases.push(current);
    return current;
  };
  return { db, options, saved, draft, snapshots, trash, migration, open };
}
describe('T918 actual IndexedDB migration service', () => {
  it('commits v1 -> v2 with a durable pre-backup and unchanged original DTO / timestamps', async () => {
    const f = await legacyDatabase();
    expect(await createDatabaseMigrationService(f.migration(), 2).run()).toMatchObject({
      version: 2,
      writable: true,
      backupId: 'backup',
    });
    const db = await f.open();
    expect(db.verno).toBe(2);
    expect(await db.table('savedExamples').get(f.saved.id)).toEqual(f.saved);
    expect(await db.table('draft').get('current')).toEqual(f.draft);
    expect(await db.table('trashExamples').get('old-trash')).toEqual(f.trash);
    expect(await db.table('ruleSnapshots').toArray()).toEqual(f.snapshots);
    expect(await db.table('migrationBackups').get('older-backup')).toEqual({
      id: 'older-backup',
      data: 'preserved',
    });
    expect(await db.table('migrationBackups').get('backup')).toMatchObject({
      from: 1,
      to: 2,
      preferences: 'old-settings',
      data: {
        savedExamples: [f.saved],
        draft: [f.draft],
        trashExamples: [f.trash],
        ruleSnapshots: f.snapshots,
      },
    });
  });
  it('runs a registered multi-step path, validates before commit and does not skip steps', async () => {
    const f = await legacyDatabase();
    const events: number[] = [];
    const steps = [
      ...DATABASE_MIGRATIONS,
      {
        from: 2,
        to: 3,
        stage: () => {
          events.push(3);
          return Promise.resolve([]);
        },
      },
    ];
    expect(await f.migration(steps).migrate(3)).toMatchObject({ version: 3, writable: true });
    expect(events).toEqual([3]);
    expect((await f.open()).verno).toBe(3);
  });
  it('fails closed before migration when backup cannot be created', async () => {
    const f = await legacyDatabase();
    const result = await f
      .migration(undefined, () => {
        throw new Error('backup preference read failed');
      })
      .migrate(2);
    expect(result.writable).toBe(false);
    const db = await f.open();
    expect(db.verno).toBe(1);
    expect(await db.table('savedExamples').get(f.saved.id)).toEqual(f.saved);
    expect(await db.table('migrationBackups').count()).toBe(1);
  });
  it('backup store QuotaExceededError prevents the versionchange and preserves the original record', async () => {
    const f = await legacyDatabase();
    // eslint-disable-next-line @typescript-eslint/unbound-method -- fault injection keeps the receiver via call.
    const add = IDBObjectStore.prototype.add;
    vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(function (
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ) {
      if (this.name === 'migrationBackups') throw new DOMException('full', 'QuotaExceededError');
      return add.call(this, value, key);
    });
    expect(await f.migration().migrate(2)).toMatchObject({
      version: 1,
      writable: false,
      backupId: null,
    });
    const db = await f.open();
    expect(db.verno).toBe(1);
    expect(await db.table('savedExamples').get(f.saved.id)).toEqual(f.saved);
    expect(await db.table('migrationBackups').count()).toBe(1);
  });
  it('rolls back writes and version after mid-upgrade failure while retaining the committed backup', async () => {
    const f = await legacyDatabase();
    const result = await f
      .migration([
        {
          from: 1,
          to: 2,
          stage: async (tx) => {
            await tx.table('savedExamples').put({ ...f.saved, name: 'must rollback' });
            throw new Error('mid failure');
          },
        },
      ])
      .migrate(2);
    expect(result).toMatchObject({ version: 1, writable: false, backupId: 'backup' });
    const db = await f.open();
    expect(db.verno).toBe(1);
    expect(await db.table('savedExamples').get(f.saved.id)).toEqual(f.saved);
    expect(await db.table('migrationBackups').get('backup')).toBeDefined();
  });
  it('retains unsupported raw data read-only; missing paths and newer DBs never downgrade/delete', async () => {
    const f = await legacyDatabase();
    const old = await f.open();
    const broken = { id: 'future', dataSchemaVersion: 999 };
    await old.table('savedExamples').add(broken);
    old.close();
    expect(await f.migration().migrate(2)).toMatchObject({
      version: 2,
      writable: false,
      reason: 'MIGRATION_RECORDS_READ_ONLY',
    });
    const db = await f.open();
    expect(await db.table('savedExamples').get('future')).toEqual(broken);
    db.close();
    expect(await f.migration().migrate(2)).toMatchObject({ writable: false });
    expect(await f.migration().migrate(1)).toMatchObject({ version: 2, writable: false });
    expect(await f.migration().migrate(7)).toMatchObject({
      reason: 'MIGRATION_PATH_UNAVAILABLE',
      writable: false,
    });
    const capability = createStorageCapability();
    capability.preserveReadOnly('MIGRATION_FAILED');
    expect(await capability.recheck(async () => {})).toBe(false);
    expect(() => capability.requirePersistence()).toThrow();
  });
});

describe('T919 clear data protection', () => {
  async function setup() {
    const f = fixture();
    await f.controller.start();
    await f.store.getState().startAnalysis();
    await f.service.save('retain');
    await f.controller.flush();
    const storage = memoryStorage();
    const preferences = new LocalPreferences(() => storage);
    await preferences.write({ ...DEFAULT_CALCULATOR_PREFERENCES, theme: 'dark' });
    const data = new DexieLocalData({
      db: f.db,
      preferences,
      storage: f.storage,
      fence: () => f.controller.clearFence(),
      now: () => Date.now(),
      estimate: () => Promise.resolve({ usage: 900, quota: 1000 }),
    });
    const backup = { exportFullBackup: vi.fn().mockResolvedValue(undefined) };
    const manager = createLocalDataManagement({
      data,
      backup,
      canManage: f.controller.canEdit,
      suspend: f.controller.suspend,
      resume: f.controller.resume,
      reset: f.controller.resetAfterClear,
    });
    return { f, preferences, storage, data, backup, manager };
  }
  it('cancel at either confirmation and exporter failure leave all data unchanged', async () => {
    const { f, preferences, manager, backup } = await setup();
    const before = await f.db.savedExamples.toArray();
    const raw = preferences.raw();
    expect(
      await manager.clear(
        () => false,
        () => 'without-backup',
      ),
    ).toBe(false);
    expect(
      await manager.clear(
        () => true,
        () => 'cancel',
      ),
    ).toBe(false);
    backup.exportFullBackup.mockRejectedValueOnce(new Error('backup failed'));
    expect(
      await manager.clear(
        () => true,
        () => 'export-first',
      ),
    ).toBe(false);
    expect(await f.db.savedExamples.toArray()).toEqual(before);
    expect(preferences.raw()).toBe(raw);
    expect(manager.state.getState().cleared).toBe(false);
  });
  it.each(['export-first', 'without-backup'] as const)(
    '%s clears exactly local user data and initializes a safe blank fenced Draft',
    async (choice) => {
      const { f, preferences, manager, backup } = await setup();
      const oldDraft = parseDraftRecord(await f.db.draft.get('current'));
      const rule = f.store.getState().rulePackage;
      expect(
        await manager.clear(
          () => true,
          () => choice,
        ),
      ).toBe(true);
      expect(backup.exportFullBackup).toHaveBeenCalledTimes(choice === 'export-first' ? 1 : 0);
      for (const table of f.db.tables.filter((table) => table.name !== 'draft'))
        expect(await table.count()).toBe(0);
      expect(await preferences.read()).toEqual(DEFAULT_CALCULATOR_PREFERENCES);
      expect(f.store.getState().document.hand.concealed).toEqual([]);
      expect(f.store.getState().rulePackage).toBe(rule);
      expect((await f.rules.getInstalledRule(rule.manifest)).manifest).toEqual(rule.manifest);
      expect(f.history.state.getState().canUndo).toBe(false);
      await expect(
        f.draftRepository.write(
          oldDraft,
          oldDraft.lease!.owner,
          oldDraft.lease!.token,
          oldDraft.writeToken,
          Date.now(),
        ),
      ).rejects.toThrow();
      expect(parseDraftRecord(await f.db.draft.get('current')).calculator.hand.concealed).toEqual(
        [],
      );
    },
  );
  it('transaction failure rolls back IndexedDB and retains preferences', async () => {
    const { f, preferences, manager } = await setup();
    const raw = preferences.raw();
    vi.spyOn(f.db.draft, 'put').mockRejectedValueOnce(new Error('transaction failed'));
    expect(
      await manager.clear(
        () => true,
        () => 'without-backup',
      ),
    ).toBe(false);
    expect(await f.db.savedExamples.count()).toBe(1);
    expect(preferences.raw()).toBe(raw);
  });
  it('takeover during export is rejected by the transaction fence', async () => {
    const { f, manager, backup } = await setup();
    backup.exportFullBackup.mockImplementationOnce(async () => {
      const current = parseDraftRecord(await f.db.draft.get('current'));
      await f.draftRepository.claim(current, 'other-tab', 'new-token', Date.now(), 6000, true);
    });
    expect(
      await manager.clear(
        () => true,
        () => 'export-first',
      ),
    ).toBe(false);
    expect(await f.db.savedExamples.count()).toBe(1);
  });
});
