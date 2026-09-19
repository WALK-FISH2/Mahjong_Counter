import { SavedExampleError } from '../../application/examples/saved-example-repository';
import type { StorageCapability } from '../../application/persistence/storage-capability';

export function canonicalPersistence(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item: unknown) => canonicalPersistence(item)).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalPersistence(child)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
export async function persistenceOperation<T>(
  operation: () => Promise<T>,
  capability?: StorageCapability,
): Promise<T> {
  try {
    return await operation();
  } catch (cause) {
    const error =
      cause instanceof SavedExampleError
        ? cause
        : new SavedExampleError(
            cause instanceof Error && cause.name === 'QuotaExceededError'
              ? 'STORAGE_QUOTA'
              : 'STORAGE_UNAVAILABLE',
          );
    capability?.fail(error);
    throw error;
  }
}
export function decodePersistence<T>(parse: (value: unknown) => T, value: unknown): T {
  try {
    return parse(value);
  } catch {
    throw new SavedExampleError('RECORD_UNREADABLE');
  }
}
