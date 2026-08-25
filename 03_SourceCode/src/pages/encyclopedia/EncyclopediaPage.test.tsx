import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { COMMON_SIMPLE_STRUCTURE_RULE_CASES } from '../../content/rules/common-simple/structure-rule-cases';
import { createCommonSimpleRuleRepository } from '../../infrastructure/rule-repository/common-simple-rule-repository';
import { EncyclopediaPage } from './EncyclopediaPage';

function renderEncyclopedia(path = '/rules', includeRuleCases = false) {
  const element = (
    <EncyclopediaPage
      repository={createCommonSimpleRuleRepository()}
      {...(includeRuleCases ? { ruleCases: COMMON_SIMPLE_STRUCTURE_RULE_CASES } : {})}
    />
  );
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="rules" element={element} />
        <Route path="rules/:ruleId/:ruleVersion" element={element} />
        <Route path="rules/:ruleId/:ruleVersion/patterns/:patternId" element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EncyclopediaPage Batch 18', () => {
  it('shows RulePackage rule facts, sources, limitations, and status filtering', async () => {
    const user = userEvent.setup();
    renderEncyclopedia();

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
    renderEncyclopedia();

    const catalog = await screen.findByRole('list', { name: '完整番表' });
    expect(within(catalog).getAllByRole('link')).toHaveLength(81);
    expect(within(catalog).getByRole('link', { name: /大四喜.*88 fan.*已启用/u })).toBeVisible();
    expect(
      within(catalog).getByRole('link', { name: /七星不靠.*24 fan.*当前不支持/u }),
    ).toBeVisible();

    await user.click(within(catalog).getByRole('link', { name: /大四喜/u }));
    const detail = screen.getByRole('article', { name: /大四喜/u });
    expect(within(detail).getByText('东南西北四副风刻或杠。')).toBeVisible();
    expect(within(detail).getByText(/大四喜 包含且不重复计入 三风刻/u)).toBeVisible();
    expect(within(detail).getByText(/中国麻将竞赛规则（SRC-A01）/u)).toBeVisible();
  });
});

describe('EncyclopediaPage Batch 19', () => {
  it('supports combined pattern filters without degrading ordinary browsing', async () => {
    const user = userEvent.setup();
    renderEncyclopedia();

    const catalog = await screen.findByRole('list', { name: '完整番表' });
    await user.type(screen.getByRole('searchbox', { name: '名称或别名' }), '十三幺');
    expect(within(catalog).getAllByRole('link')).toHaveLength(1);
    expect(within(catalog).getByRole('link', { name: /十三幺/u })).toBeVisible();

    await user.clear(screen.getByRole('searchbox', { name: '名称或别名' }));
    await user.selectOptions(screen.getByRole('combobox', { name: '番型启用状态' }), 'disabled');
    expect(within(catalog).getAllByRole('link')).toHaveLength(3);

    await user.click(screen.getByRole('checkbox', { name: '仅看当前牌面已识别番型' }));
    expect(screen.getByText('没有符合当前搜索与筛选条件的番型。')).toBeVisible();
    await user.click(screen.getByRole('checkbox', { name: '仅看当前牌面已识别番型' }));
    expect(within(catalog).getAllByRole('link')).toHaveLength(3);
  });

  it('resolves refresh-safe Pattern deep links and renders Rule Case example categories', async () => {
    renderEncyclopedia('/rules/common-simple/1.0.0/patterns/bigFourWinds', true);

    const detail = await screen.findByRole('article', { name: /大四喜/u });
    expect(within(detail).getByText('东南西北四副风刻或杠。')).toBeVisible();
    expect(screen.getByRole('heading', { name: '基础示例' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '组合示例' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '反例' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '地方特殊示例' })).toBeVisible();
    expect(screen.getByText('预期：结构成立（standard-meld-pair）')).toBeVisible();
    expect(screen.getByText(/庄家、房间倍数和平台奖励不进入结果/u)).toBeVisible();
  });
});
