import type { DraftRecord } from './persistence-models';

export interface DraftRepository {
  read(): Promise<DraftRecord | null>;
  claim(
    initial: DraftRecord,
    owner: string,
    token: string,
    now: number,
    ttl: number,
    force: boolean,
  ): Promise<Readonly<{ acquired: boolean; created: boolean; record: DraftRecord }>>;
  renew(owner: string, token: string, now: number, ttl: number): Promise<boolean>;
  release(owner: string, token: string): Promise<void>;
  write(
    record: DraftRecord,
    owner: string,
    token: string,
    expectedWriteToken: string,
    now: number,
  ): Promise<void>;
  probe(initial: DraftRecord): Promise<void>;
}

export class DraftOwnershipError extends Error {
  constructor() {
    super('DRAFT_OWNERSHIP_LOST');
  }
}
