import { createAppStore } from '../state/create-app-store';
import { SavedExampleError } from '../examples/saved-example-repository';

export function createStorageCapability() {
  const state = createAppStore<{ mode: 'persistent' | 'temporary'; reason: string | null }>(() => ({
    mode: 'persistent',
    reason: null,
  }));
  return Object.freeze({
    state,
    requirePersistence() {
      if (state.getState().mode === 'temporary') throw new SavedExampleError('STORAGE_UNAVAILABLE');
    },
    fail(error: unknown) {
      if (
        error instanceof SavedExampleError &&
        ['STORAGE_UNAVAILABLE', 'STORAGE_QUOTA'].includes(error.code)
      )
        state.setState({ mode: 'temporary', reason: error.code });
    },
    async recheck(probe: () => Promise<void>): Promise<boolean> {
      try {
        await probe();
        state.setState({ mode: 'persistent', reason: null });
        return true;
      } catch (error) {
        this.fail(error);
        return false;
      }
    },
  });
}
export type StorageCapability = ReturnType<typeof createStorageCapability>;
