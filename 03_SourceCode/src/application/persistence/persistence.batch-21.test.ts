import { afterEach, describe, expect, it, vi } from 'vitest';
import { batch21Fixture } from '../../test/helpers/batch-21-fixture';
import { persistenceDocument } from '../../test/helpers/persistence-fixture';
import { createCalculatorDocument, createHandSnapshot, createPungMeld } from '../../domain/mahjong';
import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import { RuleRepositoryError } from '../rules/rule-repository';
import {
  parseDraftRecord,
  parseRuleSnapshot,
  parseTrashExample,
} from '../../schemas/persistence/batch-21-schema';
import { DraftOwnershipError } from './draft-repository';
import { createCalculatorStore, getCalculatorStatus } from '../calculator/calculator-store';
import { createCommandHistory } from './command-history';
import { canUseHistoricalRule } from './historical-rule-compatibility';
import { commonSimpleCapabilityRegistry } from '../../infrastructure/rule-repository/common-simple-rule-repository';
import { createDraftController, type EditorSignalPort } from './draft-controller';

const fixtures: ReturnType<typeof batch21Fixture>[] = [];
function fixture(...args: Parameters<typeof batch21Fixture>) {
  const f = batch21Fixture(...args);
  fixtures.push(f);
  return f;
}
afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await Promise.all(fixtures.splice(0).map((f) => f.dispose()));
});

describe('T908 Trash transactions', () => {
  it('retains business timestamps, restores, requires explicit permanent confirmation and never expires', async () => {
    const f = fixture();
    await f.store.getState().startAnalysis();
    const saved = await f.service.save('回收站');
    await f.service.trash(saved);
    expect(await f.repository.get(saved.id)).toBeNull();
    const entries = await f.service.listTrash();
    const entry = entries[0]!;
    if (entry.status !== 'available') throw new Error('missing trash');
    expect(entry.record.modifiedAt).toBe(saved.modifiedAt);
    await f.db.trashExamples.put({ ...entry.record, trashedAt: '2000-01-01T00:00:00.000Z' });
    const retained = parseTrashExample(await f.db.trashExamples.get(saved.id));
    expect(await f.service.permanentlyDelete(retained, () => false)).toBe(false);
    expect(await f.db.trashExamples.count()).toBe(1);
    await f.service.restoreTrash(retained);
    expect(await f.repository.get(saved.id)).toEqual(saved);
    await f.service.trash(saved);
    await f.service.permanentlyDelete(
      parseTrashExample(await f.db.trashExamples.get(saved.id)),
      () => true,
    );
    expect(await f.db.trashExamples.count()).toBe(0);
    expect(await f.db.ruleSnapshots.count()).toBe(1);
  });
  it('rolls back failed moves/restores and rejects stale records or conflicting IDs', async () => {
    const f = fixture();
    await f.store.getState().startAnalysis();
    const saved = await f.service.save('事务');
    vi.spyOn(f.db.savedExamples, 'delete').mockRejectedValueOnce(
      new DOMException('quota', 'QuotaExceededError'),
    );
    await expect(f.service.trash(saved)).rejects.toMatchObject({ code: 'STORAGE_QUOTA' });
    expect(await f.repository.get(saved.id)).toEqual(saved);
    expect(await f.db.trashExamples.count()).toBe(0);
    f.storage.state.setState({ mode: 'persistent' });
    await f.service.trash(saved);
    const trash = parseTrashExample(await f.db.trashExamples.get(saved.id));
    await f.db.savedExamples.add(saved);
    await expect(f.service.restoreTrash(trash)).rejects.toMatchObject({ code: 'RECORD_CONFLICT' });
    expect(await f.db.trashExamples.count()).toBe(1);
    await expect(
      f.service.permanentlyDelete({ ...trash, name: 'stale' }, () => true),
    ).rejects.toMatchObject({ code: 'RECORD_CONFLICT' });
  });
  it('retains unreadable trash rather than deleting or rewriting it', async () => {
    const f = fixture();
    const corrupt = { id: 'broken', format: 999 };
    await f.db.trashExamples.add(corrupt);
    expect(await f.service.listTrash()).toEqual([{ status: 'unreadable', id: 'broken' }]);
    expect(await f.db.trashExamples.get('broken')).toEqual(corrupt);
  });
});

describe('T914 MinimalRuleSnapshot', () => {
  it('saves rule facts atomically and can edit/recalculate the original version after installed package removal', async () => {
    const f = fixture();
    await f.store.getState().startAnalysis();
    const saved = await f.service.save('原版');
    const snapshot = parseRuleSnapshot((await f.db.ruleSnapshots.toArray())[0]);
    expect(snapshot.payload).not.toHaveProperty('encyclopedia');
    expect(snapshot.payload.patterns).toHaveLength(81);
    expect(snapshot.payload.handModel).toEqual(commonSimpleRulePackage.handModel);
    vi.spyOn(f.rules, 'getInstalledRule').mockRejectedValue(
      new RuleRepositoryError('RULE_NOT_INSTALLED'),
    );
    const rule = await f.service.resolveHistoricalRule(saved);
    expect(rule.manifest).toEqual(commonSimpleRulePackage.manifest);
    expect((await f.service.edit(saved, () => true)).status).toBe('replaced');
    await f.store.getState().startAnalysis();
    expect(f.store.getState().analysisResult).toEqual(saved.resultSnapshot.presetResult);
    expect(await f.service.get(saved.id)).toEqual(saved);
  });
  it('rejects tampering and never substitutes latest rules or executes historical code', async () => {
    const f = fixture();
    await f.store.getState().startAnalysis();
    const saved = await f.service.save('只读');
    const latest = vi.spyOn(f.rules, 'listAvailableRules');
    vi.spyOn(f.rules, 'getInstalledRule').mockRejectedValue(
      new RuleRepositoryError('RULE_NOT_INSTALLED'),
    );
    const snapshot = parseRuleSnapshot((await f.db.ruleSnapshots.toArray())[0]);
    await f.db.ruleSnapshots.put({
      ...snapshot,
      payload: { ...snapshot.payload, legality: { ...snapshot.payload.legality, minimumFan: 99 } },
    });
    expect(await f.service.compatibility(saved)).toBe('read-only-legacy');
    expect(await f.service.get(saved.id)).toEqual(saved);
    expect(latest).not.toHaveBeenCalled();
    expect(() =>
      parseRuleSnapshot({ ...snapshot, payload: { ...snapshot.payload, eval: () => 1 } }),
    ).toThrow();
    expect(await f.service.compatibility({ ...saved, engineVersion: '99.0.0' })).toBe(
      'read-only-legacy',
    );
  });
  it('preserves Batch 20 records without snapshots and rejects unknown capabilities/engine versions', async () => {
    const f = fixture();
    await f.store.getState().startAnalysis();
    const saved = await f.service.save('旧格式');
    await f.db.ruleSnapshots.clear();
    expect(await f.service.get(saved.id)).toEqual(saved);
    expect(await f.service.compatibility(saved)).toBe('compatible');
    vi.spyOn(f.rules, 'getInstalledRule').mockRejectedValue(
      new RuleRepositoryError('RULE_NOT_INSTALLED'),
    );
    expect(await f.service.compatibility(saved)).toBe('read-only-legacy');
    const altered = {
      ...commonSimpleRulePackage,
      manifest: {
        ...commonSimpleRulePackage.manifest,
        engineCompatibility: { minEngineVersion: '9.0.0', requiredCapabilities: ['unknown'] },
      },
    };
    expect(canUseHistoricalRule(altered, '0.1.0', commonSimpleCapabilityRegistry)).toBe(false);
  });
  it('does not leave a rule snapshot behind when the saved-record write fails', async () => {
    const f = fixture();
    await f.store.getState().startAnalysis();
    vi.spyOn(f.db.savedExamples, 'add').mockRejectedValueOnce(
      new DOMException('quota', 'QuotaExceededError'),
    );
    await expect(f.service.save('失败')).rejects.toMatchObject({ code: 'STORAGE_QUOTA' });
    expect(await f.db.savedExamples.count()).toBe(0);
    expect(await f.db.ruleSnapshots.count()).toBe(0);
  });
});

describe('T909/T910 Draft persistence and restoration', () => {
  it('debounces continuous input into one write after 500ms', async () => {
    const f = fixture();
    await f.controller.start();
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
    const write = vi.spyOn(f.draftRepository, 'write');
    f.store.getState().removeConcealedTile(0);
    await vi.advanceTimersByTimeAsync(300);
    f.store.getState().removeConcealedTile(0);
    await vi.advanceTimersByTimeAsync(499);
    expect(write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await f.controller.flush();
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0]?.[0].calculator.hand).toEqual(f.store.getState().document.hand);
    expect(await f.db.draft.count()).toBe(1);
  });
  it('roundtrips partial chow edits, temp rules, correction state and the exact saved editing baseline', async () => {
    const f = fixture();
    await f.store.getState().startAnalysis();
    const saved = await f.service.save('编辑源');
    await f.controller.start();
    const invalid = createCalculatorDocument({
      ...persistenceDocument,
      hand: createHandSnapshot({
        concealed: ['m1', 'm1', 'm1', 'm1', 'm1'],
        melds: [createPungMeld('p', 'east')],
      }),
      temporaryRuleAdjustment: {
        baseRuleRef: persistenceDocument.ruleRef,
        values: { minimumFan: 8 },
      },
    });
    f.store.getState().replaceCalculator(commonSimpleRulePackage, invalid);
    f.service.restoreEditingOrigin(saved);
    f.store.getState().beginMeldEdit('p');
    await f.controller.flush();
    const draft = (await f.draftRepository.read())!;
    expect(draft.editingMeldId).toBe('p');
    expect(draft.editingOrigin).toEqual(saved);
    expect(draft.calculator.temporaryRuleAdjustment).toEqual(invalid.temporaryRuleAdjustment);
    expect(getCalculatorStatus(f.store.getState()).correctionIssues.length).toBeGreaterThan(0);
    expect(draft.calculator.transientInput.kind).toBe('pung');
    const blank = createCalculatorStore(commonSimpleRulePackage);
    const history = createCommandHistory(blank);
    const signal: EditorSignalPort = { publish() {}, subscribe: () => () => {}, close() {} };
    const restored = createDraftController({
      calculator: blank,
      repository: f.draftRepository,
      rules: f.rules,
      examples: f.service,
      storage: f.storage,
      history,
      owner: 'other',
      id: () => 'new-token',
      now: () => Date.now() + 10000,
      signal,
    });
    await restored.start();
    expect(restored.state.getState().pending).not.toBeNull();
    const before = await f.draftRepository.read();
    expect(blank.getState().document.hand.concealed).toHaveLength(0);
    expect((await f.draftRepository.read())?.calculator).toEqual(before?.calculator);
    expect(await restored.continueDraft()).toBe(true);
    expect(blank.getState().document.hand).toEqual(draft.calculator.hand);
    expect(blank.getState().editingMeldId).toBe('p');
    expect(history.state.getState().canUndo).toBe(false);
    await restored.dispose(false);
    history.dispose();
  });
  it('requires a choice on startup and only explicit new discards the previous draft', async () => {
    const f = fixture();
    await f.controller.start();
    await f.controller.flush();
    await f.controller.takeover();
    expect(f.controller.state.getState().pending).not.toBeNull();
    expect(f.controller.canEdit()).toBe(false);
    expect((await f.draftRepository.read())?.calculator.hand).toEqual(persistenceDocument.hand);
    await f.controller.newDraft();
    expect((await f.draftRepository.read())?.calculator.hand.concealed).toHaveLength(0);
  });
  it('keeps unknown-version/corrupt draft records and rejects invalid edit targets and executable values', async () => {
    const f = fixture();
    await f.controller.start();
    const record = (await f.draftRepository.read())!;
    expect(() => parseDraftRecord({ ...record, formatVersion: 2 })).toThrow();
    expect(() => parseDraftRecord({ ...record, editingMeldId: 'missing' })).toThrow();
    expect(() => parseDraftRecord({ ...record, execute: () => true })).toThrow();
    const corrupt = { key: 'current', formatVersion: 99 };
    await f.db.draft.put(corrupt);
    await expect(f.draftRepository.read()).rejects.toMatchObject({ code: 'RECORD_UNREADABLE' });
    expect(await f.db.draft.get('current')).toEqual(corrupt);
  });
});

describe('T912 lease and write fencing', () => {
  it('rejects a delayed old-tab flush after takeover without enabling Temporary Mode', async () => {
    const f = fixture();
    await f.controller.start();
    const record = (await f.draftRepository.read())!;
    const originalWrite = f.draftRepository.write.bind(f.draftRepository);
    let release: () => void = () => {
      throw new Error('write not started');
    };
    let started: () => void = () => {};
    const waiting = new Promise<void>((resolve) => {
      started = resolve;
    });
    vi.spyOn(f.draftRepository, 'write').mockImplementationOnce(async (...args) => {
      await new Promise<void>((resolve) => {
        release = resolve;
        started();
      });
      return originalWrite(...args);
    });
    f.store.getState().removeConcealedTile(0);
    const lateFlush = f.controller.flush();
    await waiting;
    const next = await f.draftRepository.claim(
      record,
      'new-tab',
      'new-lease',
      Date.now(),
      6000,
      true,
    );
    release();
    await lateFlush;
    expect(await f.draftRepository.read()).toEqual(next.record);
    expect(f.controller.state.getState().role).toBe('read-only');
    expect(f.controller.canEdit()).toBe(false);
    expect(f.storage.state.getState().mode).toBe('persistent');
  });
  it('does not let an in-flight poll acquire a second time during explicit takeover', async () => {
    const f = fixture();
    await f.controller.start();
    const record = (await f.draftRepository.read())!;
    const blank = createCalculatorStore(commonSimpleRulePackage);
    const history = createCommandHistory(blank);
    const signal: EditorSignalPort = { publish() {}, subscribe: () => () => {}, close() {} };
    let id = 0;
    const other = createDraftController({
      calculator: blank,
      repository: f.draftRepository,
      rules: f.rules,
      examples: f.service,
      storage: f.storage,
      history,
      owner: 'second-tab',
      id: () => `second-${++id}`,
      now: Date.now,
      signal,
    });
    try {
      await other.start();
      expect(other.state.getState().role).toBe('read-only');
      let finishRead: (value: typeof record | null) => void = () => {
        throw new Error('read not started');
      };
      vi.spyOn(f.draftRepository, 'read').mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishRead = resolve;
          }),
      );
      const claim = vi.spyOn(f.draftRepository, 'claim');
      const poll = other.check();
      const takeover = other.takeover();
      finishRead({ ...record, lease: null });
      await poll;
      // The stale read completes while takeover is waiting for the previous owner to yield.
      expect(claim).not.toHaveBeenCalled();
      await takeover;
      expect(claim).toHaveBeenCalledTimes(1);
      expect(claim.mock.calls[0]?.[5]).toBe(true);
      expect(await other.continueDraft()).toBe(true);
      await other.check();
      expect(other.state.getState().pending).toBeNull();
      expect(blank.getState().document.hand).toEqual(record.calculator.hand);
    } finally {
      await other.dispose(false);
      history.dispose();
    }
  });
  it('serializes simultaneous claims, takeover fences old writes, and expired leases recover without replacing draft', async () => {
    const f = fixture();
    await f.controller.start();
    const initial = (await f.draftRepository.read())!;
    const now = Date.now() + 10000;
    const [a, b] = await Promise.all([
      f.draftRepository.claim(initial, 'a', 'token-a', now, 1000, false),
      f.draftRepository.claim(initial, 'b', 'token-b', now, 1000, false),
    ]);
    expect([a.acquired, b.acquired].filter(Boolean)).toHaveLength(1);
    const winner = a.acquired ? { owner: 'a', token: 'token-a' } : { owner: 'b', token: 'token-b' };
    const takeover = await f.draftRepository.claim(initial, 'c', 'token-c', now, 1000, true);
    await expect(
      f.draftRepository.write(initial, winner.owner, winner.token, initial.writeToken, now),
    ).rejects.toBeInstanceOf(DraftOwnershipError);
    const afterExpiry = await f.draftRepository.claim(
      initial,
      'd',
      'token-d',
      now + 1001,
      1000,
      false,
    );
    expect(afterExpiry.acquired).toBe(true);
    expect(afterExpiry.record.calculator).toEqual(takeover.record.calculator);
    expect(await f.draftRepository.renew('c', 'token-c', now + 1001, 1000)).toBe(false);
  });
  it('checks the draft write token independently of document revision, and ownership loss is not storage failure', async () => {
    const f = fixture();
    await f.controller.start();
    const record = (await f.draftRepository.read())!;
    const lease = record.lease!;
    await f.draftRepository.write(
      { ...record, writeToken: 'next' },
      lease.owner,
      lease.token,
      record.writeToken,
      Date.now(),
    );
    await expect(
      f.draftRepository.write(record, lease.owner, lease.token, record.writeToken, Date.now()),
    ).rejects.toBeInstanceOf(DraftOwnershipError);
    expect(f.storage.state.getState().mode).toBe('persistent');
    expect((await f.draftRepository.read())?.writeToken).toBe('next');
  });
  it('enforces read-only in Application actions, not only disabled UI', async () => {
    const store = createCalculatorStore(
      commonSimpleRulePackage,
      persistenceDocument,
      undefined,
      undefined,
      { canEdit: () => false },
    );
    expect(store.getState().addConcealedTile('m9')).toMatchObject({
      accepted: false,
      reasonCode: 'EDITOR_READ_ONLY',
    });
    expect(store.getState().removeConcealedTile(0)).toBe(false);
    expect(store.getState().beginMeldEdit('m')).toMatchObject({ accepted: false });
    expect(store.getState().applyTemporaryRuleAdjustment({ minimumFan: 2 })).toMatchObject({
      accepted: false,
    });
    await expect(store.getState().startAnalysis()).resolves.toMatchObject({ accepted: false });
    store
      .getState()
      .replaceCalculator(
        commonSimpleRulePackage,
        createCalculatorDocument({ ...persistenceDocument, hand: createHandSnapshot() }),
      );
    expect(store.getState().document).toBe(persistenceDocument);
  });
});

describe('T911 session command history', () => {
  it('undoes and redoes tiles, winning tile, meld completion/removal, context and temporary adjustments with fresh revisions', () => {
    const f = fixture(
      createCalculatorDocument({ ...persistenceDocument, hand: createHandSnapshot() }),
    );
    const initial = f.store.getState().document;
    f.store.getState().addConcealedTile('m1');
    f.store.getState().setWinningTile('m2');
    f.store.getState().beginTransientInput('pung');
    f.store.getState().selectTransientTile('east');
    f.store.getState().updateContextValue('seatWind', 'north');
    f.store.getState().applyTemporaryRuleAdjustment({ minimumFan: 3 });
    const final = f.store.getState().document;
    let count = 0;
    while (f.history.undo()) count++;
    expect(count).toBe(6);
    expect(f.store.getState().document.hand).toEqual(initial.hand);
    expect(f.store.getState().document.revision).toBeGreaterThan(final.revision);
    while (f.history.redo()) {
      /* replay every command */
    }
    expect(f.store.getState().document.hand).toEqual(final.hand);
    expect(f.store.getState().document.temporaryRuleAdjustment).toEqual(
      final.temporaryRuleAdjustment,
    );
    f.history.undo();
    f.store.getState().addConcealedTile('p1');
    expect(f.history.state.getState().canRedo).toBe(false);
    const fresh = createCommandHistory(f.store);
    expect(fresh.state.getState().canUndo).toBe(false);
    fresh.dispose();
  });
  it('treats context auto-clears as one command and supports rule switches without persisting history', () => {
    const f = fixture();
    f.store.getState().setContextMode('self-draw');
    f.store.getState().updateContextValue('kongDraw', true);
    const before = f.store.getState().document;
    f.store.getState().setContextMode('discard');
    f.history.undo();
    expect(f.store.getState().document.context).toEqual(before.context);
    const other = {
      ...commonSimpleRulePackage,
      manifest: { ...commonSimpleRulePackage.manifest, ruleId: 'fixture-rule' },
    };
    f.store.getState().replaceCalculator(
      other,
      createCalculatorDocument({
        ...before,
        ruleRef: { ruleId: 'fixture-rule', ruleVersion: '1.0.0' },
      }),
      true,
    );
    expect(f.history.undo()).toBe(true);
    expect(f.store.getState().rulePackage).toBe(commonSimpleRulePackage);
    expect(f.history.redo()).toBe(true);
    expect(f.store.getState().rulePackage).toBe(other);
  });
  it('undoes meld removal and winning-tile replacement without losing their original semantics', () => {
    const f = fixture(
      createCalculatorDocument({
        ...persistenceDocument,
        hand: createHandSnapshot({ winningTile: 'm2' }),
      }),
    );
    f.store.getState().beginTransientInput('pung');
    f.store.getState().selectTransientTile('east');
    const meld = f.store.getState().document.hand.melds[0]!;
    expect(f.store.getState().removeMeld(meld.id)).toBe(true);
    expect(f.history.undo()).toBe(true);
    expect(f.store.getState().document.hand.melds).toEqual([meld]);
    const winningTile = f.store.getState().document.hand.winningTile;
    f.store.getState().setWinningTile('p9');
    expect(f.history.undo()).toBe(true);
    expect(f.store.getState().document.hand.winningTile).toEqual(winningTile);
  });
});

describe('T913 failure injection', () => {
  it('a non-Draft storage failure also releases the paused restoration UI into explicit Temporary Mode', async () => {
    const f = fixture();
    await f.controller.start();
    await f.controller.takeover();
    const draft = await f.draftRepository.read();
    expect(f.controller.canEdit()).toBe(false);
    vi.spyOn(f.db.savedExamples, 'get').mockRejectedValueOnce(
      new DOMException('unavailable', 'InvalidStateError'),
    );
    await expect(f.service.get('any-record')).rejects.toMatchObject({
      code: 'STORAGE_UNAVAILABLE',
    });
    expect(f.storage.state.getState().mode).toBe('temporary');
    expect(f.controller.state.getState().pending).toBeNull();
    expect(f.controller.state.getState().savedAt).toBeNull();
    expect(f.controller.canEdit()).toBe(true);
    expect((await f.store.getState().startAnalysis()).accepted).toBe(true);
    expect(await f.draftRepository.read()).toEqual(draft);
  });
  it('quota transitions to Temporary Mode without changing persisted draft or claiming a saved result', async () => {
    const f = fixture();
    await f.controller.start();
    const previous = await f.draftRepository.read();
    vi.spyOn(f.db.draft, 'put').mockRejectedValueOnce(
      new DOMException('quota', 'QuotaExceededError'),
    );
    f.store.getState().removeConcealedTile(0);
    await f.controller.flush();
    expect(f.storage.state.getState().mode).toBe('temporary');
    expect(f.controller.state.getState().savedAt).toBeNull();
    expect(await f.draftRepository.read()).toEqual(previous);
    f.store.getState().addConcealedTile('m1');
    expect((await f.store.getState().startAnalysis()).accepted).toBe(true);
    await expect(f.service.save('不能保存')).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE' });
    expect(await f.db.savedExamples.count()).toBe(0);
    await f.controller.recheckStorage();
    expect(f.storage.state.getState().mode).toBe('persistent');
    expect(f.controller.state.getState().pending).not.toBeNull();
    expect((await f.draftRepository.read())?.calculator).toEqual(previous?.calculator);
  });
  it('IndexedDB unavailable does not prevent Calculator execution', async () => {
    const f = fixture();
    vi.spyOn(f.db.draft, 'get').mockRejectedValue(new DOMException('blocked', 'InvalidStateError'));
    await f.controller.start();
    expect(f.storage.state.getState().mode).toBe('temporary');
    expect(f.controller.canEdit()).toBe(true);
    expect((await f.store.getState().startAnalysis()).accepted).toBe(true);
    await expect(f.service.save('不能保存')).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE' });
    expect(await f.controller.continueDraft()).toBe(false);
  });
});
