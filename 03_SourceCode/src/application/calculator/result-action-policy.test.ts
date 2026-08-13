import { describe, expect, it } from 'vitest';
import { getResultActionPolicy } from './result-action-policy';

describe('Result action policy', () => {
  it.each([
    ['legal-win', { save: true, copy: true, share: true }],
    ['structural-win-but-illegal', { save: false, copy: true, share: true }],
    ['not-winning', { save: false, copy: true, share: true }],
    ['incomplete-context', { save: false, copy: true, share: false }],
  ] as const)('maps %s without granting formal actions by inference', (status, expected) => {
    expect(getResultActionPolicy(status)).toEqual(expected);
  });
});
