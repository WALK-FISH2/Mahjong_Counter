import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createCommonSimpleRuleRepository } from '../../infrastructure/rule-repository/common-simple-rule-repository';
import { EncyclopediaPage } from './EncyclopediaPage';

describe('EncyclopediaPage Batch 18', () => {
  it('shows RulePackage rule facts, sources, limitations, and status filtering', async () => {
    const user = userEvent.setup();
    render(<EncyclopediaPage repository={createCommonSimpleRuleRepository()} />);

    expect(await screen.findByRole('heading', { name: '大众麻将·通用简化版' })).toBeVisible();
    expect(screen.getByText(/144 张实体牌/u)).toBeVisible();
    expect(screen.getByText('默认不封顶')).toBeVisible();
    expect(screen.getByText('普通结构、七对、十三幺')).toBeVisible();
    expect(screen.getByRole('heading', { name: '来源与可信度' })).toBeVisible();
    expect(screen.getByText('中国麻将竞赛规则')).toBeVisible();
    expect(screen.getByText(/v0\.1\.0 暂不支持七星不靠/u)).toBeVisible();

    await user.selectOptions(screen.getByRole('combobox', { name: '支持状态' }), 'full');
    expect(screen.getByText('当前没有符合该状态的规则。')).toBeVisible();
    expect(screen.queryByRole('heading', { name: '大众麻将·通用简化版' })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: '支持状态' }), 'test');
    expect(
      within(screen.getByRole('list', { name: '规则列表' })).getByText('大众麻将·通用简化版'),
    ).toBeVisible();
  });

  it('renders the complete Engine pattern catalog and resolves Pattern ref details', async () => {
    const user = userEvent.setup();
    render(<EncyclopediaPage repository={createCommonSimpleRuleRepository()} />);

    const catalog = await screen.findByRole('list', { name: '完整番表' });
    expect(within(catalog).getAllByRole('button')).toHaveLength(81);
    expect(within(catalog).getByRole('button', { name: /大四喜.*88 fan.*已启用/u })).toBeVisible();
    expect(
      within(catalog).getByRole('button', { name: /七星不靠.*24 fan.*当前不支持/u }),
    ).toBeVisible();

    await user.click(within(catalog).getByRole('button', { name: /大四喜/u }));
    const detail = screen.getByRole('article', { name: /大四喜/u });
    expect(within(detail).getByText('东南西北四副风刻或杠。')).toBeVisible();
    expect(within(detail).getByText(/大四喜 包含且不重复计入 三风刻/u)).toBeVisible();
    expect(within(detail).getByText(/中国麻将竞赛规则（SRC-A01）/u)).toBeVisible();
  });
});
