import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AppErrorBoundary } from './AppErrorBoundary';

function BrokenChild(): ReactNode {
  throw new Error('sensitive internal detail');
}

describe('AppErrorBoundary', () => {
  it('renders children while the application is healthy', () => {
    render(
      <AppErrorBoundary>
        <p>应用正常</p>
      </AppErrorBoundary>,
    );

    expect(screen.getByText('应用正常')).toBeVisible();
  });

  it('shows a safe fallback without exposing internal errors', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      render(
        <AppErrorBoundary>
          <BrokenChild />
        </AppErrorBoundary>,
      );

      expect(screen.getByRole('alert')).toHaveTextContent('应用暂时无法继续');
      expect(screen.queryByText('sensitive internal detail')).not.toBeInTheDocument();
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
