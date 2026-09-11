import type { SavedExampleRecord } from './persistence-models';

export type SavedExampleEntry =
  | Readonly<{ status: 'available'; record: SavedExampleRecord }>
  | Readonly<{ status: 'unreadable'; id: string }>;

export interface SavedExampleRepository {
  list(): Promise<readonly SavedExampleEntry[]>;
  get(id: string): Promise<SavedExampleRecord | null>;
  add(record: SavedExampleRecord): Promise<void>;
  update(record: SavedExampleRecord, expected: SavedExampleRecord): Promise<void>;
}
export interface ClockPort {
  now(): string;
}
export interface IdGeneratorPort {
  next(): string;
}

export class SavedExampleError extends Error {
  constructor(
    readonly code:
      | 'STORAGE_UNAVAILABLE'
      | 'STORAGE_QUOTA'
      | 'RECORD_UNREADABLE'
      | 'RECORD_CONFLICT'
      | 'SAVE_NOT_ALLOWED'
      | 'INVALID_NAME'
      | 'BUSY'
      | 'CALCULATOR_CHANGED'
      | 'RULE_UNAVAILABLE',
  ) {
    super(code);
    this.name = 'SavedExampleError';
  }
}
