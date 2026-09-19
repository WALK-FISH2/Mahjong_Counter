import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { persistenceFixture } from '../../test/helpers/persistence-fixture';
import { SaveExampleDialog } from './SaveExampleDialog';
import { SavedExampleError } from '../../application/examples';
import { SavedExamplesPage } from '../../pages/saved-examples/SavedExamplesPage';
import { SavedExampleDetailPage } from '../../pages/saved-examples/SavedExampleDetailPage';

const fixtures: ReturnType<typeof persistenceFixture>[] = [];
function fixture() {
  const f = persistenceFixture();
  fixtures.push(f);
  return f;
}
afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await Promise.all(fixtures.splice(0).map(({ db }) => db.delete()));
});

describe('Batch 20 saved example UI', () => {
  it('offers only a name, traps/restores focus, and reports save failure without closing', async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    const save = vi.fn().mockRejectedValue(new SavedExampleError('STORAGE_QUOTA'));
    render(
      <SaveExampleDialog initialName="默认名称" updating={false} onClose={close} onSave={save} />,
    );
    const dialog = screen.getByRole('dialog', { name: '保存牌例' });
    const input = within(dialog).getByRole('textbox', { name: '名称' });
    expect(input).toHaveFocus();
    expect(dialog.querySelectorAll('input')).toHaveLength(1);
    await user.tab({ shift: true });
    expect(within(dialog).getByRole('button', { name: '取消' })).toHaveFocus();
    await user.tab();
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, '修改名称');
    await user.click(within(dialog).getByRole('button', { name: '确认保存' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('存储空间不足');
    expect(save).toHaveBeenCalledWith('修改名称');
    expect(close).not.toHaveBeenCalled();
    expect(input).toHaveValue('修改名称');
    await user.keyboard('{Escape}');
    expect(close).toHaveBeenCalledOnce();
  });

  it('lists duplicates with separate links and filters by name/rule without writing', async () => {
    const { service, store } = fixture();
    await store.getState().startAnalysis();
    await service.save('Same');
    await service.save('Same');
    await service.save('Different');
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SavedExamplesPage service={service} />
      </MemoryRouter>,
    );
    expect(await screen.findAllByRole('link', { name: 'Same' })).toHaveLength(2);
    const links = screen.getAllByRole('link', { name: 'Same' });
    expect(links[0]!.getAttribute('href')).not.toBe(links[1]!.getAttribute('href'));
    await user.type(screen.getByRole('searchbox', { name: '名称搜索' }), 'same');
    expect(screen.queryByRole('link', { name: 'Different' })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: '规则筛选' }), 'common-simple');
    expect(screen.getAllByRole('link', { name: 'Same' })).toHaveLength(2);
    expect(await service.list()).toHaveLength(3);
  });

  it('opens all saved layers and explanatory facts read-only; cancel does not touch Calculator or storage', async () => {
    const { service, store } = fixture();
    store.getState().applyTemporaryRuleAdjustment({ minimumFan: 1 });
    await store.getState().startAnalysis();
    store
      .getState()
      .applyFanAdjustment(
        store.getState().analysisResult!.candidates[0]!.relation.counted[0]!.candidate.patternId,
        'exclude',
      );
    const saved = await service.save('历史三层');
    const current = store.getState().document;
    const analyze = vi.spyOn(store.getState(), 'startAnalysis');
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[`/saved/${saved.id}`]}>
        <Routes>
          <Route path="saved/:exampleId" element={<SavedExampleDetailPage service={service} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: '历史三层' })).toBeVisible();
    expect(screen.getByText(/只读查看/u)).toBeVisible();
    expect(screen.getByRole('button', { name: '用户调整结果' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: '系统预设结果' }));
    await user.click(screen.getByRole('button', { name: '本次规则结果' }));
    expect(screen.queryByRole('button', { name: '临时调整本次规则' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '保存牌例' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /取消计入/u })).not.toBeInTheDocument();
    await user.click(screen.getByText('保存时的条件与调整'));
    expect(screen.getByText('最低起胡值')).toBeVisible();
    expect(screen.getByText('门风')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '编辑牌例' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '取消' }));
    expect(store.getState().document).toBe(current);
    expect(analyze).not.toHaveBeenCalled();
    expect(await service.get(saved.id)).toEqual(saved);
  });
});
