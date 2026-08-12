import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  createCalculatorStore,
  createInitialCalculatorDocument,
} from '../../application/calculator/calculator-store';
import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import { createCalculatorDocument } from '../../domain/mahjong/calculator-document';
import { CalculatorPage } from './CalculatorPage';

describe('CalculatorPage Batch 11 interaction', () => {
  it('keeps the formal mobile document order and exposes the current test rule', () => {
    const store = createCalculatorStore(commonSimpleRulePackage);
    const { container } = render(<CalculatorPage store={store} />);
    const layout = container.querySelector('[data-testid="calculator-layout"]');

    expect(screen.getAllByText('大众麻将·通用简化版')[0]).toBeVisible();
    expect(screen.getAllByText('测试版')[0]).toBeVisible();
    expect(screen.getByText('v1.0.0')).toBeVisible();
    expect(screen.getByText('选择规则')).toBeVisible();
    expect(layout?.querySelectorAll('h2')).toHaveLength(5);
    expect([...layout!.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual([
      '选牌器',
      '吃碰杠花',
      '已录入牌面',
      '和牌条件',
      '分析结果',
    ]);
  });

  it('shows the session-adjustment status without changing the rule identity', () => {
    const initialDocument = createInitialCalculatorDocument(commonSimpleRulePackage);
    const adjustedDocument = createCalculatorDocument({
      ...initialDocument,
      temporaryRuleAdjustment: {
        baseRuleRef: initialDocument.ruleRef,
        values: { minimumFan: 1 },
      },
    });
    const store = createCalculatorStore(commonSimpleRulePackage, adjustedDocument);

    render(<CalculatorPage store={store} />);

    expect(screen.getByText('本次规则已调整')).toBeVisible();
    expect(screen.getAllByText('大众麻将·通用简化版')[0]).toBeVisible();
  });

  it('uses one store for palette counts and the entered hand', async () => {
    const user = userEvent.setup();
    const store = createCalculatorStore(commonSimpleRulePackage);
    render(<CalculatorPage store={store} />);

    const palette = screen.getByRole('heading', { name: '选牌器' }).closest('section')!;
    const hand = screen.getByRole('heading', { name: '已录入牌面' }).closest('section')!;
    const oneWan = within(palette).getByRole('button', { name: /一万，已使用 0 张/ });

    await user.click(oneWan);
    await user.click(within(palette).getByRole('button', { name: /一万，已使用 1 张/ }));

    expect(within(hand).getAllByRole('button', { name: '撤回一万' })).toHaveLength(2);
    expect(within(palette).getByRole('button', { name: /一万，已使用 2 张/ })).toBeEnabled();

    await user.click(within(hand).getAllByRole('button', { name: '撤回一万' })[0]!);
    expect(within(hand).getAllByRole('button', { name: '撤回一万' })).toHaveLength(1);
    expect(store.getState().document.hand.concealed).toEqual(['m1']);
  });

  it('keeps flower tiles in the dynamic palette without bypassing the dedicated input flow', async () => {
    const user = userEvent.setup();
    const store = createCalculatorStore(commonSimpleRulePackage);
    render(<CalculatorPage store={store} />);
    const palette = screen.getByRole('heading', { name: '选牌器' }).closest('section')!;

    await user.click(within(palette).getByRole('button', { name: /春，已使用 0 张/ }));

    expect(screen.getByRole('status')).toHaveTextContent('不能加入当前结构录入');
    expect(store.getState().document.hand.concealed).toEqual([]);
    expect(store.getState().document.hand.flowers).toEqual([]);
  });

  it('sorts the visual hand without mutating the original concealed order', async () => {
    const user = userEvent.setup();
    const store = createCalculatorStore(commonSimpleRulePackage);
    render(<CalculatorPage store={store} />);
    const palette = screen.getByRole('heading', { name: '选牌器' }).closest('section')!;
    const hand = screen.getByRole('heading', { name: '已录入牌面' }).closest('section')!;

    await user.click(within(palette).getByRole('button', { name: /九筒，已使用 0 张/ }));
    await user.click(within(palette).getByRole('button', { name: /二万，已使用 0 张/ }));
    await user.click(within(palette).getByRole('button', { name: /一筒，已使用 0 张/ }));
    await user.click(within(hand).getByRole('button', { name: '一键整理' }));

    expect(store.getState().document.hand.concealed).toEqual(['p9', 'm2', 'p1']);
    expect(
      within(hand)
        .getAllByRole('button', { name: /^撤回/ })
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['撤回二万', '撤回一筒', '撤回九筒']);
    expect(screen.getByText(/原始录入顺序未改变/)).toBeVisible();
  });
});
