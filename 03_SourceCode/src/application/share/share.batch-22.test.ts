// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { shareFixture } from '../../test/helpers/share-fixture';
import { persistenceDocument } from '../../test/helpers/persistence-fixture';
import {
  createCalculatorDocument,
  createHandSnapshot,
  createWinContext,
  createConcealedKongMeld,
  createOpenKongMeld,
  createChowMeld,
  createPungMeld,
  TILE_CODES,
  getTileMetadata,
} from '../../domain/mahjong';
import {
  formatEvaluationText,
  formatHandText,
  formatShareText,
  tileGroupText,
} from '../result-text/result-text-formatter';
import { getTileSymbol } from '../result-text/tile-symbol';
import { parseSharePayload } from '../../schemas/share/share-payload-schema';
import { captureFormalShare, projectShareCalculator } from './share-service';
import {
  ENGINE_VERSION,
  SHARE_FORMAT_VERSION,
  SINGLE_EXAMPLE_FORMAT_VERSION,
} from '../../app/version';
import { createShareCodec } from '../../infrastructure/share/share-codec';
import { captureResultSnapshot } from '../examples/saved-example-snapshot';

async function completed() {
  const f = shareFixture();
  await f.store.getState().startAnalysis();
  return f;
}
async function encoded(f: Awaited<ReturnType<typeof completed>>) {
  const url = await f.service.encode(f.service.captureFormal(), 'https://example.test/app/');
  if (url.status !== 'ready') throw new Error(`Fixture URL not ready: ${url.status}`);
  return url.url.split('/share/')[1]!;
}
describe('Batch 22 T1001/T1002 pure formatter', () => {
  it('maps every TileCode to a unique Unicode symbol and Chinese name without DOM', () => {
    expect(typeof window).toBe('undefined');
    expect(new Set(TILE_CODES.map(getTileSymbol)).size).toBe(TILE_CODES.length);
    for (const tile of TILE_CODES) {
      expect([...getTileSymbol(tile)]).toHaveLength(1);
      expect(tileGroupText([tile])).toContain(getTileMetadata(tile).chineseName);
    }
  });
  it('keeps concealed/winning/meld/flower, direct/added/concealed kongs distinct', () => {
    const text = formatHandText(
      createHandSnapshot({
        concealed: ['m1'],
        winningTile: 'white',
        flowers: ['plum'],
        melds: [
          createChowMeld('c', ['m1', 'm2', 'm3']),
          createPungMeld('p', 'east'),
          createOpenKongMeld('o', 'p2', 'direct'),
          createOpenKongMeld('a', 'p3', 'added'),
          createConcealedKongMeld('k', 's1'),
        ],
      }),
    );
    for (const group of [
      '手牌：',
      '胡牌张：',
      '花牌：',
      '吃：',
      '碰：',
      '明杠（直杠）',
      '明杠（加杠）',
      '暗杠：',
    ])
      expect(text).toContain(group);
  });
  it('formats simple/detailed layers, TESTING, adjustments, exclusions and Explanation', async () => {
    const f = await completed();
    f.store.getState().applyTemporaryRuleAdjustment({ minimumFan: 1 });
    await f.store.getState().startAnalysis();
    const c = f.store.getState().analysisResult!.candidates[0]!;
    f.store.getState().applyFanAdjustment(c.relation.counted[0]!.candidate.patternId, 'exclude');
    const p = f.service.captureFormal();
    const simple = formatShareText(p, 'simple');
    const detailed = formatShareText(p, 'detailed');
    for (const t of [
      '用户调整结果',
      'TESTING',
      '1.0.0',
      '临时规则调整',
      '番型人工调整',
      '手牌',
      '胡牌张',
    ])
      expect(simple).toContain(t);
    expect(simple).not.toContain('Explanation');
    for (const t of ['Explanation', 'EXCLUDED', '基础合法性', '规则来源', '用户调整详情'])
      expect(detailed).toContain(t);
    expect(p.resultSnapshot.kind).toBe('evaluation');
    if (p.resultSnapshot.kind === 'evaluation')
      expect(
        formatEvaluationText(
          {
            calculator: p.calculator,
            rule: p.rule,
            snapshot: p.resultSnapshot.value,
            layer: 'preset',
            candidateId: p.view.candidateId,
          },
          'simple',
        ),
      ).toContain('系统预设结果');
  });
});
describe('T1003 contract and eligibility', () => {
  it('projects only share input, not local source/revision/lease/UI/preferences/history', async () => {
    const f = await completed();
    const p = f.service.captureFormal();
    expect(p.contentType).toBe('legal-win');
    expect(Object.keys(p.calculator).sort()).toEqual([
      'context',
      'fanAdjustments',
      'hand',
      'ruleRef',
      'schemaVersion',
      'temporaryRuleAdjustment',
    ]);
    expect(projectShareCalculator(f.store.getState().document)).toEqual(p.calculator);
    expect(p.resultSnapshot.kind === 'evaluation' && p.resultSnapshot.value.documentRevision).toBe(
      0,
    );
    expect(Object.isFrozen(p.calculator.hand)).toBe(true);
  });
  it('shares cannot-win and rejects incomplete, stale, pending, correction, Quick Calc, engine error', async () => {
    const f = await completed();
    f.store.getState().applyTemporaryRuleAdjustment({ minimumFan: 1000 });
    await f.store.getState().startAnalysis();
    expect(f.service.captureFormal().contentType).toBe('cannot-win');
    expect(() => f.service.captureFormal('quick-calc')).toThrow('SHARE_QUICK');
    f.controls.engineError = true;
    expect(() => f.service.captureFormal()).toThrow('SHARE_ENGINE');
    f.controls.engineError = false;
    const current = f.store.getState();
    expect(() =>
      captureFormalShare({ ...current, analysisStatus: 'analyzing' }, ENGINE_VERSION),
    ).toThrow();
    expect(() => captureFormalShare({ ...current, analysisRevision: 0 }, ENGINE_VERSION)).toThrow();
    expect(() =>
      captureFormalShare({ ...current, analysisDocument: persistenceDocument }, ENGINE_VERSION),
    ).toThrow();
    expect(() =>
      captureFormalShare(
        {
          ...current,
          document: createCalculatorDocument({
            ...current.document,
            hand: createHandSnapshot({
              concealed: ['m1', 'm1', 'm1', 'm1', 'm1'],
              winningTile: 'm2',
            }),
          }),
        },
        ENGINE_VERSION,
      ),
    ).toThrow();
    f.store.getState().clearContextValue('seatWind');
    await f.store.getState().startAnalysis();
    expect(() => f.service.captureFormal()).toThrow();
  });
  it('keeps format families independent even when numeric versions coincide', async () => {
    const p = (await completed()).service.captureFormal();
    expect(p.version).toBe(SHARE_FORMAT_VERSION);
    expect(() =>
      parseSharePayload({
        ...p,
        format: 'mahjong-example',
        version: SINGLE_EXAMPLE_FORMAT_VERSION,
      }),
    ).toThrow();
    expect(() => parseSharePayload({ ...p, version: 999 })).toThrow();
    expect(() =>
      parseSharePayload({ ...p, calculator: { ...p.calculator, revision: 99 } }),
    ).toThrow();
    expect(() => parseSharePayload({ ...p, savedExamples: [] })).toThrow();
  });
  it('rejects RuleRef/engine/layer/candidate reference mismatches and incomplete external snapshots', async () => {
    const p = (await completed()).service.captureFormal();
    if (p.resultSnapshot.kind !== 'evaluation') throw new Error();
    const snapshot = p.resultSnapshot.value;
    expect(() =>
      parseSharePayload({
        ...p,
        calculator: { ...p.calculator, ruleRef: { ruleId: 'other', ruleVersion: '1.0.0' } },
      }),
    ).toThrow();
    expect(() =>
      parseSharePayload({ ...p, rule: { ...p.rule, engineVersion: 'other' } }),
    ).toThrow();
    expect(() =>
      parseSharePayload({ ...p, view: { layer: 'user-adjusted', candidateId: 'bad' } }),
    ).toThrow();
    expect(() =>
      parseSharePayload({
        ...p,
        resultSnapshot: {
          kind: 'evaluation',
          value: {
            ...snapshot,
            presetResult: { ...snapshot.presetResult, status: 'incomplete-context' },
          },
        },
      }),
    ).toThrow();
  });
  it('ready/discard outcomes retain both modes and legal/pending/structural semantics', async () => {
    const doc = createCalculatorDocument({
      ...persistenceDocument,
      hand: createHandSnapshot({ ...persistenceDocument.hand, winningTile: null }),
    });
    const f = shareFixture(doc);
    const state = f.store.getState();
    const result = await f.ready.analyze(state.document, state.rulePackage);
    const p = await f.service.captureReady(result, state.document);
    expect(p.contentType).toBe('ready-analysis');
    expect(formatShareText(p, 'detailed')).toContain('legal');
    const pending = shareFixture(
      createCalculatorDocument({ ...doc, context: createWinContext('discard') }),
    );
    const pendingResult = await pending.ready.analyze(
      pending.store.getState().document,
      pending.store.getState().rulePackage,
    );
    expect(
      formatShareText(
        await pending.service.captureReady(pendingResult, pending.store.getState().document),
        'simple',
      ),
    ).toContain('pending-context');
    f.store.getState().applyTemporaryRuleAdjustment({ minimumFan: 1000 });
    const current = f.store.getState();
    const illegal = await f.ready.analyze(current.document, current.rulePackage);
    const shared = await f.service.captureReady(illegal, current.document);
    expect(formatShareText(shared, 'simple')).toContain('structural-only');
    expect(
      shared.resultSnapshot.kind === 'ready-analysis' && shared.resultSnapshot.sessionRule,
    ).toBeDefined();
    const url = await createShareCodec().encode(p, 'https://test.local');
    if (url.status !== 'ready') throw new Error(`Not ready: ${url.status}`);
    expect(await createShareCodec().decode(url.url.split('/share/')[1]!)).toEqual(p);
  });
  it('does not pair a user-adjusted total with a different displayed candidate', async () => {
    const f = await completed();
    const candidate = f.store.getState().analysisResult!.candidates[0]!;
    f.store
      .getState()
      .applyFanAdjustment(candidate.relation.counted[0]!.candidate.patternId, 'exclude');
    const p = f.service.captureFormal();
    if (p.resultSnapshot.kind !== 'evaluation') throw new Error();
    const snapshot = p.resultSnapshot.value;
    const adjusted = snapshot.userAdjustedResult;
    if (adjusted === undefined) throw new Error();
    const original = snapshot.presetResult.candidates.find(
      (c) => c.candidateId === adjusted.result.candidateId,
    );
    if (original === undefined) throw new Error();
    const alternate = { ...original, candidateId: 'different-display-candidate' };
    expect(() =>
      parseSharePayload({
        ...p,
        view: { layer: 'user-adjusted', candidateId: alternate.candidateId },
        resultSnapshot: {
          kind: 'evaluation',
          value: {
            ...snapshot,
            lastViewedCandidateId: alternate.candidateId,
            presetResult: {
              ...snapshot.presetResult,
              candidates: [...snapshot.presetResult.candidates, alternate],
            },
          },
        },
      }),
    ).toThrow('Adjustment base mismatch');
  });
});
describe('T1006 isolated opening and guards', () => {
  it('rejects unissued payloads and a previously eligible payload after document/layer changes', async () => {
    const f = await completed();
    const issued = f.service.captureFormal();
    await expect(f.service.encode(parseSharePayload(issued), 'https://test.local')).rejects.toThrow(
      'SHARE_UNISSUED_PAYLOAD',
    );
    f.store.getState().removeWinningTile();
    await expect(f.service.encode(issued, 'https://test.local')).rejects.toThrow(
      'SHARE_UNFINISHED_OR_STALE',
    );
  });
  it('rechecks revision after asynchronous compression instead of returning a late URL', async () => {
    const f = await completed();
    const request = f.service.encode(f.service.captureFormal(), 'https://test.local');
    f.store.getState().removeWinningTile();
    await expect(request).rejects.toThrow('SHARE_UNFINISHED_OR_STALE');
  });
  it('not-winning (no structural candidates) remains shareable without fabricating a legal candidate', async () => {
    const f = shareFixture(
      createCalculatorDocument({
        ...persistenceDocument,
        hand: createHandSnapshot({ ...persistenceDocument.hand, winningTile: 'p9' }),
      }),
    );
    await f.store.getState().startAnalysis();
    const p = f.service.captureFormal();
    expect(p.contentType).toBe('cannot-win');
    expect(p.view.candidateId).toBeNull();
    expect(formatShareText(p, 'detailed')).toContain('不能胡牌');
  });
  it('rejects an incomplete actual layer even when a complete preset is being displayed', async () => {
    const f = await completed();
    const state = f.store.getState();
    const base = state.layeredEvaluation!.preset;
    if (base.status !== 'legal-win') throw new Error();
    expect(() =>
      captureFormalShare(
        {
          ...state,
          layeredEvaluation: {
            preset: base,
            sessionRule: {
              adjustment: { baseRuleRef: state.document.ruleRef, values: {} },
              evaluation: { ...base, status: 'incomplete-context' },
            },
          },
        },
        ENGINE_VERSION,
      ),
    ).toThrow('SHARE_INCOMPLETE_CONTEXT');
  });
  it('preview is side effect free; cancel/failure preserve input; replace rebases revision and distrusts external result', async () => {
    const f = await completed();
    const encodedValue = await encoded(f);
    const original = f.store.getState();
    const preview = await f.service.preview(encodedValue);
    expect(preview.compatibility).toBe('compatible');
    expect(f.store.getState()).toBe(original);
    expect(f.controls.protected).toBe(0);
    expect((await f.service.open(preview, () => false)).status).toBe('cancelled');
    expect(f.store.getState()).toBe(original);
    f.controls.protect = false;
    expect((await f.service.open(preview, () => true)).status).toBe('draft-protection-failed');
    expect(f.store.getState()).toBe(original);
    f.controls.protect = true;
    expect((await f.service.open(preview, () => true)).status).toBe('replaced');
    expect(f.store.getState().document.revision).toBeGreaterThan(original.document.revision);
    expect(f.store.getState().analysisResult).toBeNull();
    expect(f.store.getState().document.source.kind).toBe('shared');
    f.store.getState().removeWinningTile();
    expect((await f.service.restoreOriginal(() => true)).status).toBe('replaced');
    expect(f.store.getState().document.hand).toEqual(original.document.hand);
  });
  it('pending draft/read-only tab, takeover and document changes cannot replace', async () => {
    const f = await completed();
    const preview = await f.service.preview(await encoded(f));
    f.controls.writable = false;
    expect((await f.service.open(preview, () => true)).status).toBe('editor-read-only');
    f.controls.writable = true;
    expect(
      (
        await f.service.open(preview, () => {
          f.controls.writable = false;
          return true;
        })
      ).status,
    ).toBe('editor-read-only');
    f.controls.writable = true;
    expect(
      (
        await f.service.open(preview, () => {
          f.store.getState().removeWinningTile();
          return true;
        })
      ).status,
    ).toBe('draft-protection-failed');
    expect(f.store.getState().document.hand.winningTile).toBeNull();
  });
  it('Temporary Mode preserves outgoing text/link but blocks inbound replacement', async () => {
    const f = await completed();
    f.controls.protect = false;
    expect(f.service.copyFormal('simple')).toContain('系统预设结果');
    const preview = await f.service.preview(await encoded(f));
    expect((await f.service.open(preview, () => true)).status).toBe('draft-protection-failed');
  });
  it('missing/incompatible exact rule stays read-only without latest-version fallback', async () => {
    const f = await completed();
    const p = f.service.captureFormal();
    if (p.resultSnapshot.kind !== 'evaluation') throw new Error();
    const changed = parseSharePayload({
      ...p,
      rule: { ...p.rule, engineVersion: '999' },
      resultSnapshot: {
        kind: 'evaluation',
        value: { ...p.resultSnapshot.value, engineVersion: '999' },
      },
    });
    const url = await createShareCodec().encode(changed, 'https://test.local');
    if (url.status !== 'ready') throw new Error();
    const preview = await f.service.preview(url.url.split('/share/')[1]!);
    expect(preview.compatibility).toBe('read-only');
    await expect(f.service.open(preview, () => true)).rejects.toThrow('SHARE_PREVIEW_READ_ONLY');
    expect(captureResultSnapshot(f.store.getState(), ENGINE_VERSION).engineVersion).toBe(
      ENGINE_VERSION,
    );
  });
});
