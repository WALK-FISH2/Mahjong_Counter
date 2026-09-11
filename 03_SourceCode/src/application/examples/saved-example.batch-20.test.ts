import { afterEach, describe, expect, it, vi } from 'vitest';
import { persistenceDocument, persistenceFixture } from '../../test/helpers/persistence-fixture';
import {
  createCalculatorDocument,
  createHandSnapshot,
  createOpenKongMeld,
  createChowMeld,
  createPungMeld,
} from '../../domain/mahjong';
import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import {
  canSaveExample,
  defaultExampleName,
  persistCalculator,
  restoreCalculator,
  restoreEvaluation,
  querySavedExamples,
  SavedExampleError,
} from './index';
import { parseSavedExample } from '../../schemas/persistence/saved-example-schema';
import { MahjongDatabase } from '../../infrastructure/db/mahjong-database';
import { DexieSavedExampleRepository } from '../../infrastructure/db/dexie-saved-example-repository';
import { createCalculatorStore } from '../calculator/calculator-store';

const fixtures: ReturnType<typeof persistenceFixture>[] = [];
function fixture(...args: Parameters<typeof persistenceFixture>) {
  const value = persistenceFixture(...args);
  fixtures.push(value);
  return value;
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(fixtures.splice(0).map(({ db }) => db.delete()));
});

describe('Batch 20 T901/T902 persistence roundtrip', () => {
  it('opens, closes and reopens the six exact stores, without later-batch writes', async () => {
    const { db, service, store } = fixture();
    await db.open();
    expect(db.tables.map((table) => table.name).sort()).toEqual(
      [
        'savedExamples',
        'trashExamples',
        'draft',
        'ruleSnapshots',
        'rulePackageMetadata',
        'migrationBackups',
      ].sort(),
    );
    await store.getState().startAnalysis();
    await service.save('完整牌例');
    db.close();
    await db.open();
    expect(await db.savedExamples.count()).toBe(1);
    for (const table of db.tables.filter(({ name }) => name !== 'savedExamples'))
      expect(await table.count()).toBe(0);
  });

  it('roundtrips document, three layers, complete candidates/placements/explanations, adjustments and revisions through IndexedDB', async () => {
    const { store, service, db, options } = fixture();
    store.getState().applyTemporaryRuleAdjustment({ minimumFan: 1 });
    await store.getState().startAnalysis();
    const actual = store.getState().layeredEvaluation!.sessionRule!.evaluation;
    const pattern = actual.candidates[0]!.relation.counted[0]!.candidate.patternId;
    expect(store.getState().applyFanAdjustment(pattern, 'exclude')).toEqual({ accepted: true });
    const document = store.getState().document;
    const layers = store.getState().layeredEvaluation!;
    const saved = await service.save('三层往返');
    db.close();
    const reopened = new MahjongDatabase(db.name, options);
    try {
      const loaded = (await new DexieSavedExampleRepository(reopened).get(saved.id))!;
      expect(loaded).toEqual(saved);
      expect(restoreCalculator(loaded.calculator)).toEqual(document);
      expect(loaded.resultSnapshot.documentRevision).toBe(document.revision);
      expect(restoreEvaluation(loaded.resultSnapshot.presetResult)).toEqual(layers.preset);
      expect(restoreEvaluation(loaded.resultSnapshot.sessionRuleResult!)).toEqual(
        layers.sessionRule!.evaluation,
      );
      expect(loaded.resultSnapshot.userAdjustedResult).toEqual(layers.userAdjustment);
      expect(loaded.resultSnapshot.highestCandidateIds).toEqual(actual.highestLegalCandidateIds);
      expect(loaded.resultSnapshot.lastViewedLayer).toBe('user-adjusted');
      expect(loaded.resultSnapshot.userAdjustedResult!.result.baseLegality).toEqual(
        actual.candidates[0]!.legality,
      );
      expect(loaded.resultSnapshot.display.preset.patterns).not.toHaveLength(0);
      expect(loaded.resultSnapshot).not.toHaveProperty('rulePackage');
    } finally {
      reopened.close();
    }
  });

  it('preserves declared groups, flowers and winning tile as separate document facts', () => {
    const doc = createCalculatorDocument({
      ...persistenceDocument,
      hand: createHandSnapshot({
        concealed: ['s1', 's2', 's3', 'white'],
        winningTile: 'white',
        melds: [
          createChowMeld('c', ['m1', 'm2', 'm3']),
          createPungMeld('p', 'east'),
          createOpenKongMeld('k', 'p2', 'added'),
        ],
        flowers: ['spring'],
      }),
    });
    expect(restoreCalculator(persistCalculator(doc))).toEqual(doc);
  });

  it('keeps all ties and winning tile placements, not only the displayed result', async () => {
    const zeroValueRule = {
      ...commonSimpleRulePackage,
      patterns: commonSimpleRulePackage.patterns.map((pattern) => ({ ...pattern, value: 0 })),
    };
    const { store, service } = fixture(
      createCalculatorDocument({
        ...persistenceDocument,
        hand: createHandSnapshot({
          concealed: ['m1', 'm1', 'm1', 'm2', 'm2', 'm2', 'm3', 'm3', 'm3', 'm4', 'm4', 'm4', 'm5'],
          winningTile: 'm5',
        }),
      }),
      zeroValueRule,
    );
    await store.getState().startAnalysis();
    const evaluation = store.getState().layeredEvaluation!.preset;
    expect(evaluation.candidates.length).toBeGreaterThan(1);
    expect(evaluation.highestLegalCandidateIds.length).toBeGreaterThan(1);
    store.getState().selectAnalysisCandidate(evaluation.highestLegalCandidateIds.at(-1)!);
    const saved = await service.save('多解');
    expect(saved.resultSnapshot.presetResult).toEqual(evaluation);
    expect(saved.resultSnapshot.highestCandidateIds).toEqual(evaluation.highestLegalCandidateIds);
    expect(saved.resultSnapshot.lastViewedCandidateId).toBe(
      evaluation.highestLegalCandidateIds.at(-1),
    );
  });

  it('retains stale adjustment reasons as facts and never applies them as new rules', async () => {
    const { store, service } = fixture(
      createCalculatorDocument({
        ...persistenceDocument,
        fanAdjustments: [{ patternId: 'unrecognized', action: 'exclude' }],
      }),
    );
    await store.getState().startAnalysis();
    const saved = await service.save('待复核调整');
    expect(saved.resultSnapshot.userAdjustedResult!.result.adjustmentStates[0]).toMatchObject({
      status: 'stale',
      reasonCode: 'PATTERN_NOT_RECOGNIZED',
    });
  });
});

describe('Batch 20 T903/T904 actual-layer save policy', () => {
  it('never reuses the last legal result after an Engine Error or late replaced-document response', async () => {
    const good = fixture();
    await good.store.getState().startAnalysis();
    const result = good.store.getState().analysisResult!;
    const evaluate = vi
      .fn()
      .mockResolvedValueOnce(result)
      .mockRejectedValueOnce(new Error('engine failed'));
    const store = createCalculatorStore(commonSimpleRulePackage, persistenceDocument, evaluate);
    await store.getState().startAnalysis();
    expect(canSaveExample(store.getState())).toBe(true);
    store.getState().invalidateAnalysis();
    expect(await store.getState().startAnalysis()).toEqual({
      accepted: false,
      reasonCode: 'ANALYSIS_FAILED',
    });
    expect(canSaveExample(store.getState())).toBe(false);
    expect(store.getState().analysisResult).toBeNull();
    let finish = () => {};
    const pending = new Promise<typeof result>((resolve) => {
      finish = () => resolve(result);
    });
    const late = createCalculatorStore(commonSimpleRulePackage, persistenceDocument, () => pending);
    const running = late.getState().startAnalysis();
    late
      .getState()
      .replaceCalculator(
        commonSimpleRulePackage,
        createCalculatorDocument({ ...persistenceDocument }),
      );
    finish();
    await running;
    expect(late.getState().analysisResult).toBeNull();
    expect(canSaveExample(late.getState())).toBe(false);
  });

  it('denies illegal actual layer even while viewing a legal preset or applying Fan Adjustment', async () => {
    const { store, service } = fixture();
    store.getState().applyTemporaryRuleAdjustment({ minimumFan: 1000 });
    await store.getState().startAnalysis();
    store.getState().setActiveEvaluationLayer('preset');
    expect(store.getState().analysisResult!.status).toBe('legal-win');
    expect(canSaveExample(store.getState())).toBe(false);
    await expect(service.save('不能绕过')).rejects.toMatchObject({ code: 'SAVE_NOT_ALLOWED' });
    store.getState().setActiveEvaluationLayer('session-rule');
    store
      .getState()
      .applyFanAdjustment(
        store.getState().analysisResult!.candidates[0]!.relation.counted[0]!.candidate.patternId,
        'exclude',
      );
    await expect(service.save('仍不能保存')).rejects.toMatchObject({ code: 'SAVE_NOT_ALLOWED' });
  });

  it('allows a legal effective result even when preset is illegal', async () => {
    const strictRule = {
      ...commonSimpleRulePackage,
      legality: { ...commonSimpleRulePackage.legality, minimumFan: 1000 },
    };
    const { store, service } = fixture(persistenceDocument, strictRule);
    store.getState().applyTemporaryRuleAdjustment({ minimumFan: 0 });
    await store.getState().startAnalysis();
    store.getState().setActiveEvaluationLayer('preset');
    expect(store.getState().analysisResult!.status).toBe('structural-win-but-illegal');
    expect(canSaveExample(store.getState())).toBe(true);
    expect((await service.save('本次规则合法')).resultSnapshot.sessionRuleResult!.status).toBe(
      'legal-win',
    );
  });

  it('binds eligibility to document identity and revision; pending/error/ready/correction cannot save', async () => {
    const { store, service } = fixture();
    expect(canSaveExample(store.getState())).toBe(false);
    await store.getState().startAnalysis();
    expect(canSaveExample(store.getState())).toBe(true);
    const completed = store.getState();
    expect(
      canSaveExample({
        ...completed,
        document: createCalculatorDocument({ ...completed.document }),
      }),
    ).toBe(false);
    expect(
      canSaveExample({ ...completed, analysisRevision: completed.document.revision - 1 }),
    ).toBe(false);
    expect(canSaveExample({ ...completed, analysisStatus: 'idle' })).toBe(false);
    store.getState().removeConcealedTile(0);
    await expect(service.save('过期')).rejects.toMatchObject({ code: 'SAVE_NOT_ALLOWED' });
    await store.getState().startAnalysis();
    expect(canSaveExample(store.getState())).toBe(false);
    expect(
      canSaveExample({
        ...completed,
        document: createCalculatorDocument({
          ...completed.document,
          hand: createHandSnapshot({ ...completed.document.hand, winningTile: null }),
        }),
      }),
    ).toBe(false);
  });

  it('creates IDs independently of names, rejects blank names, and never changes the current result on save', async () => {
    const { store, service, repository } = fixture();
    await store.getState().startAnalysis();
    const before = store.getState();
    await expect(service.save('  ')).rejects.toMatchObject({ code: 'INVALID_NAME' });
    const first = await service.save('同名');
    const second = await service.save('同名');
    expect(first.id).not.toBe(second.id);
    expect(await repository.list()).toHaveLength(2);
    expect(store.getState().document).toBe(before.document);
    expect(store.getState().analysisResult).toBe(before.analysisResult);
  });

  it.each(['shared', 'imported'] as const)(
    'only explicitly saves %s content as a new record',
    async (kind) => {
      const { store, service, repository } = fixture(
        createCalculatorDocument({ ...persistenceDocument, source: { kind } }),
      );
      await store.getState().startAnalysis();
      expect(await repository.list()).toEqual([]);
      const saved = await service.save('主动另存');
      expect(saved.calculator.source.kind).toBe(kind);
      expect(await repository.list()).toHaveLength(1);
    },
  );

  it('generates a stable rule-plus-major-pattern name excluding ordinary extras', async () => {
    const { store } = fixture();
    await store.getState().startAnalysis();
    const name = defaultExampleName(store.getState());
    expect(name.startsWith(`${commonSimpleRulePackage.manifest.displayName} `)).toBe(true);
    expect(name).not.toMatch(/自摸|门前清|花牌/u);
    expect(name).toBe(defaultExampleName(store.getState()));
    expect(name.split(' ').at(-1)!.split('、').length).toBeLessThanOrEqual(2);
    const ordinaryRule = {
      ...commonSimpleRulePackage,
      patterns: commonSimpleRulePackage.patterns.filter((pattern) =>
        ['recognizer.concealedHand', 'recognizer.selfDrawn', 'recognizer.flowerTiles'].includes(
          pattern.recognizerKey,
        ),
      ),
    };
    expect(defaultExampleName({ ...store.getState(), rulePackage: ordinaryRule })).toBe(
      `${commonSimpleRulePackage.manifest.displayName} 普通和牌`,
    );
  });
});

describe('Batch 20 T905–T907 explicit editing and safe updates', () => {
  it('does not attach an in-flight save to a replacement with the same source and revision', async () => {
    const { store, service, repository } = fixture();
    await store.getState().startAnalysis();
    const originalAdd = repository.add.bind(repository);
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(repository, 'add').mockImplementation(async (record) => {
      await pending;
      await originalAdd(record);
    });
    const saving = service.save('旧会话');
    store
      .getState()
      .replaceCalculator(
        commonSimpleRulePackage,
        createCalculatorDocument({ ...store.getState().document }),
      );
    release();
    const saved = await saving;
    expect(await service.get(saved.id)).toEqual(saved);
    expect(service.session.getState().editingOriginal).toBeNull();
    expect(service.session.getState().savedDocument).toBeNull();
  });

  it('blocks replacement when draft protection fails or input changes during confirmation', async () => {
    const { store, service, drafts } = fixture();
    await store.getState().startAnalysis();
    const record = await service.save('保护');
    const current = store.getState().document;
    vi.spyOn(drafts, 'protectBeforeReplacement').mockRejectedValueOnce(
      new Error('protection failed'),
    );
    expect((await service.edit(record, () => true)).status).toBe('draft-protection-failed');
    expect(store.getState().document).toBe(current);
    await expect(
      service.edit(record, () => {
        store.getState().removeConcealedTile(0);
        return true;
      }),
    ).rejects.toMatchObject({ code: 'CALCULATOR_CHANGED' });
    expect(store.getState().document.hand.concealed).toHaveLength(
      current.hand.concealed.length - 1,
    );
    expect(await service.get(record.id)).toEqual(record);
  });

  it('denies incomplete contexts, transient inputs and needs-correction documents', async () => {
    const incomplete = fixture(
      createCalculatorDocument({
        ...persistenceDocument,
        context: { mode: 'discard', values: {} },
      }),
    );
    await incomplete.store.getState().startAnalysis();
    await expect(incomplete.service.save('信息不足')).rejects.toMatchObject({
      code: 'SAVE_NOT_ALLOWED',
    });
    const { store, service } = fixture();
    await store.getState().startAnalysis();
    store.getState().beginTransientInput('chow');
    await expect(service.save('临时副露')).rejects.toMatchObject({ code: 'SAVE_NOT_ALLOWED' });
    const invalid = fixture(
      createCalculatorDocument({
        ...persistenceDocument,
        hand: createHandSnapshot({
          ...persistenceDocument.hand,
          concealed: [...persistenceDocument.hand.concealed, 'white', 'white', 'white'],
        }),
      }),
    );
    await invalid.store.getState().startAnalysis();
    await expect(invalid.service.save('超量')).rejects.toMatchObject({ code: 'SAVE_NOT_ALLOWED' });
  });

  it('filters names/rules and sorts modified times and names with stable tie ordering', async () => {
    const { store, service, advanceTime, repository } = fixture();
    await store.getState().startAnalysis();
    const first = await service.save('Alpha');
    advanceTime();
    const second = await service.save('Beta');
    const entries = await repository.list();
    const query = { search: '', ruleId: '', sort: 'modified-desc' as const };
    expect(querySavedExamples(entries, query).map(({ id }) => id)).toEqual([second.id, first.id]);
    expect(
      querySavedExamples(entries, { ...query, sort: 'modified-asc' }).map(({ id }) => id),
    ).toEqual([first.id, second.id]);
    expect(querySavedExamples(entries, { ...query, sort: 'name' }).map(({ name }) => name)).toEqual(
      ['Alpha', 'Beta'],
    );
    expect(querySavedExamples(entries, { ...query, search: 'ALP' })).toEqual([first]);
    expect(querySavedExamples(entries, { ...query, ruleId: 'absent' })).toEqual([]);
  });

  it('read-only get and cancelled edit preserve both stored record and current Calculator', async () => {
    const { store, service, drafts } = fixture();
    await store.getState().startAnalysis();
    const record = await service.save('只读');
    store.getState().removeConcealedTile(0);
    const current = store.getState().document;
    expect(await service.get(record.id)).toEqual(record);
    expect(store.getState().document).toBe(current);
    expect(await service.edit(record, () => false)).toEqual({ status: 'cancelled' });
    expect(store.getState().document).toBe(current);
    expect(drafts.getLastProtected()!.document).toBe(current);
  });

  it('updates only explicitly, save-as keeps original, and discard restores a temporary copy without DB writes', async () => {
    const { store, service, advanceTime, repository } = fixture();
    await store.getState().startAnalysis();
    const original = await service.save('原始');
    expect(await service.edit(original, () => true)).toEqual({ status: 'replaced' });
    expect(store.getState().document.source).toEqual({
      kind: 'saved-example',
      exampleId: original.id,
    });
    store.getState().applyTemporaryRuleAdjustment({ minimumFan: 1 });
    await store.getState().startAnalysis();
    expect(await service.get(original.id)).toEqual(original);
    advanceTime();
    const updated = await service.save('显式更新', 'update');
    expect(updated.id).toBe(original.id);
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.modifiedAt).not.toBe(original.modifiedAt);
    const copy = await service.save('另存', 'new');
    expect(copy.id).not.toBe(updated.id);
    expect(await service.get(original.id)).toEqual(updated);
    store.getState().removeConcealedTile(0);
    expect(await service.discard(() => false)).toBeNull();
    expect(await service.discard(() => true)).toBe(copy.id);
    expect(store.getState().document.hand).toEqual(copy.calculator.hand);
    expect(await repository.list()).toHaveLength(2);
    expect(await service.get(copy.id)).toEqual(copy);
  });

  it('rejects concurrent overwrite even with equal timestamps, and rolls back a quota failure', async () => {
    const { store, service, repository, db } = fixture();
    await store.getState().startAnalysis();
    const original = await service.save('原始');
    const first = { ...original, name: '另一标签更新' };
    await repository.update(first, original);
    await expect(
      repository.update({ ...original, name: '并发更新' }, original),
    ).rejects.toMatchObject({ code: 'RECORD_CONFLICT' });
    await expect(repository.add(original)).rejects.toMatchObject({ code: 'RECORD_CONFLICT' });
    expect(await repository.get(original.id)).toEqual(first);
    vi.spyOn(db.savedExamples, 'put').mockRejectedValueOnce(
      new DOMException('quota', 'QuotaExceededError'),
    );
    await expect(repository.update({ ...first, name: '失败更新' }, first)).rejects.toMatchObject({
      code: 'STORAGE_QUOTA',
    });
    expect(await repository.get(original.id)).toEqual(first);
  });

  it('does not report success or discard Calculator input after a storage failure', async () => {
    const { store, service, repository } = fixture();
    await store.getState().startAnalysis();
    const doc = store.getState().document;
    vi.spyOn(repository, 'add').mockRejectedValueOnce(new SavedExampleError('STORAGE_UNAVAILABLE'));
    await expect(service.save('失败')).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE' });
    expect(service.session.getState()).toEqual({
      editingOriginal: null,
      savedDocument: null,
      busy: false,
    });
    expect(store.getState().document).toBe(doc);
    expect(await repository.list()).toEqual([]);
  });

  it('validates unknown data and isolates corrupt or future-version rows without deleting them', async () => {
    const { store, service, db, repository } = fixture();
    await store.getState().startAnalysis();
    const good = await service.save('正常');
    const invalid: unknown[] = [
      { ...good, dataSchemaVersion: 99 },
      { ...good, calculator: { ...good.calculator, revision: -1 } },
      { ...good, resultSnapshot: { ...good.resultSnapshot, documentRevision: 0 } },
      { ...good, ruleRef: { ...good.ruleRef, ruleVersion: '9.0.0' } },
      { ...good, injected: 'extra-field' },
      { ...good, name: () => 'code' },
      { ...good, resultSnapshot: { ...good.resultSnapshot, highestCandidateIds: ['missing'] } },
      {
        ...good,
        resultSnapshot: {
          ...good.resultSnapshot,
          display: {
            ...good.resultSnapshot.display,
            preset: {
              ...good.resultSnapshot.display.preset,
              sources: [{ sourceId: 'unsafe', title: 'Unsafe', url: 'javascript:alert(1)' }],
            },
          },
        },
      },
      { ...good, name: 'x'.repeat(1_000_001) },
      { ...good, calculator: { ...good.calculator, revision: Number.NaN } },
      JSON.parse('{"__proto__":{"polluted":true}}'),
    ];
    for (const value of invalid) expect(() => parseSavedExample(value)).toThrow();
    const corrupt = { ...good, id: 'corrupt', dataSchemaVersion: 99 };
    await db.savedExamples.add(corrupt);
    expect(await repository.list()).toContainEqual({ status: 'unreadable', id: 'corrupt' });
    await expect(repository.get('corrupt')).rejects.toMatchObject({ code: 'RECORD_UNREADABLE' });
    expect(await db.savedExamples.get('corrupt')).toEqual(corrupt);
    expect(await repository.get(good.id)).toEqual(good);
  });
});
