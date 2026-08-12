import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../App';

describe('main routes', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('opens the calculator from the default route', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: '选牌器' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '算番' })).toBeVisible();
  });

  it('navigates to all four page shells', async () => {
    const user = userEvent.setup();

    render(<App />);

    const expectedPages = ['算番', '规则百科', '已保存牌例', '设置'] as const;

    for (const pageName of expectedPages) {
      await user.click(screen.getByRole('link', { name: pageName }));
      expect(screen.getByRole('heading', { name: pageName })).toBeVisible();
    }
  });
});
