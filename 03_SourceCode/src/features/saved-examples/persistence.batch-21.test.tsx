import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { batch21Fixture } from '../../test/helpers/batch-21-fixture';
import { RuleRepositoryError } from '../../application/rules/rule-repository';
import { SavedExampleError } from '../../application/examples';
import { SavedExampleDetailPage } from '../../pages/saved-examples/SavedExampleDetailPage';
import { PersistencePanel } from './PersistencePanel';

const fixtures: ReturnType<typeof batch21Fixture>[] = [];
function fixture() {
  const f = batch21Fixture();
  fixtures.push(f);
  return f;
}
afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await Promise.all(fixtures.splice(0).map((f) => f.dispose()));
});

describe('Batch 21 persistence UI', () => {
  it('requires an explicit startup choice and clears session history when starting new', async () => {
    const f = fixture();
    await f.controller.start();
    await f.controller.takeover();
    const user = userEvent.setup();
    render(
      <PersistencePanel
        persistence={{ drafts: f.controller, storage: f.storage, history: f.history }}
      />,
    );
    expect(screen.getByRole('button', { name: '撤销操作' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '继续上次牌面' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '放弃草稿并新建' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '继续上次牌面' })).not.toBeInTheDocument(),
    );
    await f.controller.flush();
    expect((await f.draftRepository.read())?.calculator.hand.concealed).toEqual([]);
    expect(f.history.state.getState().canUndo).toBe(false);
  });

  it('shows explicit Temporary Mode and removes stale saved/restore claims', async () => {
    const f = fixture();
    await f.controller.start();
    await f.controller.takeover();
    render(
      <PersistencePanel
        persistence={{ drafts: f.controller, storage: f.storage, history: f.history }}
      />,
    );
    act(() => f.storage.fail(new SavedExampleError('STORAGE_QUOTA')));
    expect(screen.getByText('临时使用模式')).toBeVisible();
    expect(screen.getByText(/保存牌例、草稿恢复和持久化写入已暂停/u)).toBeVisible();
    expect(screen.queryByText('草稿已保存')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '继续上次牌面' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新检测存储' })).toBeEnabled();
  });

  it.each([false, true])(
    'shows saved results with installed package missing (incompatible engine: %s)',
    async (incompatible) => {
      const f = fixture();
      await f.store.getState().startAnalysis();
      const original = await f.service.save('历史结果');
      const saved = incompatible
        ? {
            ...original,
            engineVersion: '99.0.0',
            resultSnapshot: { ...original.resultSnapshot, engineVersion: '99.0.0' },
          }
        : original;
      await f.db.savedExamples.put(saved);
      vi.spyOn(f.rules, 'getInstalledRule').mockRejectedValue(
        new RuleRepositoryError('RULE_NOT_INSTALLED'),
      );
      const analyze = vi.spyOn(f.store.getState(), 'startAnalysis');
      const latest = vi.spyOn(f.rules, 'listAvailableRules');
      render(
        <MemoryRouter initialEntries={[`/saved/${saved.id}`]}>
          <Routes>
            <Route
              path="saved/:exampleId"
              element={<SavedExampleDetailPage service={f.service} />}
            />
          </Routes>
        </MemoryRouter>,
      );
      expect(await screen.findByRole('heading', { name: '历史结果' })).toBeVisible();
      expect(screen.getByRole('heading', { name: '合法和牌' })).toBeVisible();
      if (incompatible) {
        expect(await screen.findByText(/历史牌例只读（read-only-legacy）/u)).toBeVisible();
        expect(screen.getByRole('button', { name: '编辑牌例' })).toBeDisabled();
      } else {
        await waitFor(() => expect(screen.getByRole('button', { name: '编辑牌例' })).toBeEnabled());
        const historical = await f.service.resolveHistoricalRule(saved);
        expect(historical.manifest.displayName).toBe(saved.resultSnapshot.display.ruleName);
        expect(historical.sources.length).toBeGreaterThan(0);
      }
      expect(analyze).not.toHaveBeenCalled();
      expect(latest).not.toHaveBeenCalled();
      expect(await f.service.get(saved.id)).toEqual(saved);
    },
  );
});
