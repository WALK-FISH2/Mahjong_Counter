import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../content/rules/common-simple/scoring-capabilities';
import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import { createQuickCalcEvaluator } from '../../application/calculator/quick-calc';
import { QuickCalcPanel } from './QuickCalcPanel';

const evaluate = createQuickCalcEvaluator({
  scoringStrategies: commonSimpleScoringStrategyRegistry,
  extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
});

describe('QuickCalcPanel', () => {
  it('inherits the rule, selects patterns and keeps the result visibly unverified', async () => {
    const user = userEvent.setup();
    render(
      <QuickCalcPanel
        rulePackage={commonSimpleRulePackage}
        evaluate={evaluate}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getAllByText('用户选择，未经牌面验证')).toHaveLength(1);
    expect(screen.getByText(/common-simple@1.0.0/)).toBeVisible();
    await user.selectOptions(screen.getByLabelText('门风'), '0');
    await user.selectOptions(screen.getByLabelText('圈风'), '1');
    await user.click(screen.getByRole('checkbox', { name: /碰碰和/ }));
    await user.click(screen.getByRole('button', { name: '计算用户所选番型' }));
    expect(screen.getAllByText('用户选择，未经牌面验证')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: '临时合计' })).toBeVisible();
    expect(screen.getByText('达到当前规则门槛')).toBeVisible();
  });

  it('shows relation exclusions and never exposes formal result actions', async () => {
    const user = userEvent.setup();
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(
      <QuickCalcPanel
        rulePackage={commonSimpleRulePackage}
        evaluate={evaluate}
        onClose={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('checkbox', { name: /边张/ }));
    await user.click(screen.getByRole('checkbox', { name: /单钓将/ }));
    await user.click(screen.getByRole('button', { name: '计算用户所选番型' }));
    const result = screen.getByRole('heading', { name: '临时合计' }).closest('section')!;
    expect(within(result).getByText(/边张：/)).toHaveTextContent('互斥');
    expect(within(result).getByRole('button', { name: '复制文字' })).toBeEnabled();
    for (const forbidden of ['保存牌例', '分享链接', '听牌分析', '查看拆分']) {
      expect(within(result).queryByRole('button', { name: forbidden })).not.toBeInTheDocument();
    }
    await user.click(within(result).getByRole('button', { name: '复制文字' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('用户选择，未经牌面验证'));
    expect(within(result).getByRole('status')).toHaveTextContent('已复制快速算番文字');
    if (originalClipboard === undefined) {
      Reflect.deleteProperty(navigator, 'clipboard');
    } else {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    }
  });
});
