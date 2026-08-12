import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createCalculatorStore } from '../../application/calculator/calculator-store';
import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import type { SystemEvaluation } from '../../domain/engine/evaluation';
import {
  createCalculatorDocument,
  createHandSnapshot,
  createWinContext,
  knownContextValue,
} from '../../domain/mahjong';
import { CalculatorPage } from './CalculatorPage';

function documentWith(hand = createHandSnapshot(), context = createWinContext('discard')) {
  return createCalculatorDocument({
    schemaVersion: 1,
    ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
    hand,
    context,
  });
}

const RESULT: SystemEvaluation = Object.freeze({
  status: 'incomplete-context',
  ruleRef: Object.freeze({ ruleId: 'common-simple', ruleVersion: '1.0.0' }),
  candidates: Object.freeze([]),
  highestLegalCandidateIds: Object.freeze([]),
  selectedCandidateId: null,
});

describe('CalculatorPage Batch 13 interaction', () => {
  it('renders RulePackage contexts, reports missing fields, and restores cleared mode data', async () => {
    const user = userEvent.setup();
    const context = createWinContext('self-draw', {
      seatWind: knownContextValue('east'),
      roundWind: knownContextValue('south'),
      afterKongReplacement: knownContextValue(true),
    });
    const store = createCalculatorStore(commonSimpleRulePackage, documentWith(undefined, context));
    render(<CalculatorPage store={store} />);

    const panel = screen.getByRole('heading', { name: '和牌条件' }).closest('section')!;
    expect(within(panel).getByRole('radio', { name: '自摸' })).toBeChecked();
    await user.click(within(panel).getByText('更多条件'));
    expect(within(panel).getByRole('checkbox', { name: '杠上开花' })).toBeChecked();
    expect(within(panel).queryByRole('checkbox', { name: '抢杠和' })).not.toBeInTheDocument();

    await user.click(within(panel).getByRole('radio', { name: '点炮' }));
    expect(within(panel).getByRole('status')).toHaveTextContent('已清除 1 个不适用条件');
    expect(store.getState().document.context.values.afterKongReplacement).toBeUndefined();
    expect(within(panel).getByRole('checkbox', { name: '抢杠和' })).toBeVisible();

    await user.click(within(panel).getByRole('button', { name: '撤销切换' }));
    expect(within(panel).getByRole('radio', { name: '自摸' })).toBeChecked();
    expect(within(panel).getByRole('checkbox', { name: '杠上开花' })).toBeChecked();
  });

  it('prompts for required context and keeps analysis disabled', () => {
    const store = createCalculatorStore(commonSimpleRulePackage, documentWith(), () => RESULT);
    render(<CalculatorPage store={store} />);

    expect(screen.getByRole('alert')).toHaveTextContent('还需补全：门风、圈风');
    expect(screen.getByRole('button', { name: '开始分析' })).toBeDisabled();
    expect(screen.getByText('还需补全 2 个和牌条件')).toBeVisible();
  });

  it('shows structural and physical counts and all four action-bar states', async () => {
    const user = userEvent.setup();
    const hand = createHandSnapshot({
      concealed: [
        'm1',
        'm2',
        'm3',
        'p1',
        'p2',
        'p3',
        's1',
        's2',
        's3',
        'east',
        'east',
        'east',
        'white',
      ],
      winningTile: 'white',
    });
    const context = createWinContext('discard', {
      seatWind: knownContextValue('east'),
      roundWind: knownContextValue('south'),
    });
    let resolveEvaluation!: (result: SystemEvaluation) => void;
    const store = createCalculatorStore(
      commonSimpleRulePackage,
      documentWith(hand, context),
      () =>
        new Promise((resolve) => {
          resolveEvaluation = resolve;
        }),
    );
    render(<CalculatorPage store={store} />);

    expect(screen.getByText('结构张数 14 / 14')).toBeVisible();
    expect(screen.getByText('实际牌数 14 张')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '开始分析' }));
    expect(screen.getByText('正在分析…')).toBeVisible();
    expect(screen.getByRole('button', { name: '取消分析' })).toBeVisible();

    resolveEvaluation(RESULT);
    expect(await screen.findByText('分析已完成')).toBeVisible();
    expect(screen.getByRole('button', { name: '查看结果' })).toBeVisible();
  });

  it('highlights preserved correction issues and clears only after explicit action', async () => {
    const user = userEvent.setup();
    const store = createCalculatorStore(
      commonSimpleRulePackage,
      documentWith(createHandSnapshot({ concealed: ['m1', 'm1', 'm1', 'm1', 'm1'] })),
    );
    render(<CalculatorPage store={store} />);

    const correction = screen
      .getByRole('heading', { name: '牌面存在 1 个问题' })
      .closest('section')!;
    expect(within(correction).getByRole('alert')).toHaveTextContent('输入已原样保留');
    expect(store.getState().document.hand.concealed).toHaveLength(5);
    await user.click(within(correction).getByRole('button', { name: '定位问题' }));
    expect(within(correction).getByRole('listitem')).toHaveFocus();
    await user.click(within(correction).getByRole('button', { name: '清除异常内容' }));
    expect(store.getState().document.hand.concealed).toHaveLength(4);
    expect(screen.queryByRole('heading', { name: '牌面存在 1 个问题' })).not.toBeInTheDocument();
  });
});
