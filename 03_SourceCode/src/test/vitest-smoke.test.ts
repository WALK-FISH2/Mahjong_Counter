import { describe, expect, it } from 'vitest';

describe('Vitest environment', () => {
  it('runs a pure unit test', () => {
    const sampleItems = [1, 2, 3, 4] as const;

    expect(sampleItems).toHaveLength(4);
  });
});
