import { describe, expect, it, vi } from 'vitest';

import { createAppStore } from './create-app-store';

type FixtureState = {
  readonly count: number;
  readonly increment: () => void;
};

describe('createAppStore', () => {
  it('creates a typed Zustand store with actions and subscriptions', () => {
    const store = createAppStore<FixtureState>((set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }));
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.getState().increment();

    expect(store.getState().count).toBe(1);
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
  });
});
