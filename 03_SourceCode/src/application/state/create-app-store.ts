import { createStore, type StateCreator, type StoreApi } from 'zustand/vanilla';

export type AppStore<TState> = StoreApi<TState>;

export function createAppStore<TState>(initializer: StateCreator<TState>): AppStore<TState> {
  return createStore(initializer);
}
