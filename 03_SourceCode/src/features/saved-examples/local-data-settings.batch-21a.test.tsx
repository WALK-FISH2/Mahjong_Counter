import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LocalDataSettings } from './LocalDataSettings';
import { createLocalDataManagement } from '../../application/persistence/local-data-management';

describe('T919 clear-data UI confirmations', () => {
  it('lists the exact scope and never clears on either cancellation or failed export', async () => {
    const clear = vi.fn().mockResolvedValue(undefined);
    const service = createLocalDataManagement({
      data: { clear, estimate: () => Promise.resolve({ usage: 900, quota: 1000 }) },
      backup: { exportFullBackup: () => Promise.reject(new Error('backup failed')) },
      canManage: () => true,
      suspend: () => Promise.resolve(),
      resume: () => {},
      reset: () => Promise.resolve(),
    });
    const user = userEvent.setup();
    render(<LocalDataSettings service={service} />);
    await screen.findByText(/存储空间紧张/);
    await user.click(screen.getByRole('button', { name: '清除全部本地数据' }));
    expect(screen.getByText('历史规则快照')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(clear).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '清除全部本地数据' }));
    await user.click(screen.getByRole('button', { name: '已了解范围，继续' }));
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(clear).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '清除全部本地数据' }));
    await user.click(screen.getByRole('button', { name: '已了解范围，继续' }));
    await user.click(screen.getByRole('button', { name: '先导出完整备份再清除' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('backup failed');
    expect(clear).not.toHaveBeenCalled();
  });
});
