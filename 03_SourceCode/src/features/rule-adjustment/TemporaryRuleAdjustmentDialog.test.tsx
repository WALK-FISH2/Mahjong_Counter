import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import { TemporaryRuleAdjustmentDialog } from './TemporaryRuleAdjustmentDialog';

describe('TemporaryRuleAdjustmentDialog', () => {
  it('renders exactly the fields declared by RulePackage and applies only overrides', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const { container } = render(
      <TemporaryRuleAdjustmentDialog
        rulePackage={commonSimpleRulePackage}
        currentValues={{}}
        onApply={onApply}
        onRestore={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(container.querySelectorAll('[data-adjustment-id]')).toHaveLength(
      commonSimpleRulePackage.temporaryAdjustments.length,
    );
    expect(container.querySelector('[data-adjustment-id="undeclared"]')).toBeNull();

    const minimumFan = container.querySelector<HTMLInputElement>(
      '[data-adjustment-id="minimumFan"]',
    )!;
    await user.clear(minimumFan);
    await user.type(minimumFan, '8');
    await user.click(screen.getByRole('button', { name: '应用本次规则' }));
    expect(onApply).toHaveBeenCalledWith({ minimumFan: 8 });
    expect(commonSimpleRulePackage.legality.minimumFan).toBe(0);
  });

  it('discards draft edits on cancel and exposes explicit preset restoration', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onRestore = vi.fn();
    const onClose = vi.fn();
    const { container } = render(
      <TemporaryRuleAdjustmentDialog
        rulePackage={commonSimpleRulePackage}
        currentValues={{ minimumFan: 4 }}
        onApply={onApply}
        onRestore={onRestore}
        onClose={onClose}
      />,
    );
    const minimumFan = container.querySelector<HTMLInputElement>(
      '[data-adjustment-id="minimumFan"]',
    )!;
    await user.clear(minimumFan);
    await user.type(minimumFan, '12');
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onApply).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '恢复系统预设' }));
    expect(onRestore).toHaveBeenCalledOnce();
  });
});
