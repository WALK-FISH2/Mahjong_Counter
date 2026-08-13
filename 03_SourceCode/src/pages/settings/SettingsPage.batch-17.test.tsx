import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { InMemoryCalculatorPreferencesPort } from '../../application/preferences';
import { SettingsPage } from './SettingsPage';

describe('SettingsPage Batch 17', () => {
  it('remembers the selected ready-analysis sort mode through the Preferences Port', async () => {
    const user = userEvent.setup();
    const port = new InMemoryCalculatorPreferencesPort();
    render(<SettingsPage preferencesPort={port} />);

    expect(await screen.findByRole('radio', { name: '高番优先（默认）' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: '听口优先' }));
    await expect.poll(async () => (await port.read()).waitSortMode).toBe('wait-count');
  });
});
