import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

function ExampleButton() {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button type="button" onClick={() => setIsPressed(true)}>
      {isPressed ? '已点击' : '点击示例'}
    </button>
  );
}

describe('React Testing Library environment', () => {
  it('renders and interacts with an example button', async () => {
    const user = userEvent.setup();

    render(<ExampleButton />);
    await user.click(screen.getByRole('button', { name: '点击示例' }));

    expect(screen.getByRole('button', { name: '已点击' })).toBeVisible();
  });
});
