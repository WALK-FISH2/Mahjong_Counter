import { describe, expect, it } from 'vitest';

import {
  APP_VERSION,
  BACKUP_FORMAT_VERSION,
  DATABASE_SCHEMA_VERSION,
  ENGINE_VERSION,
  SHARE_FORMAT_VERSION,
  SINGLE_EXAMPLE_FORMAT_VERSION,
} from './index';

describe('version constants', () => {
  it('keeps app and engine versions explicit', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('keeps each persisted format version explicit', () => {
    expect(DATABASE_SCHEMA_VERSION).toBeGreaterThan(0);
    expect(BACKUP_FORMAT_VERSION).toBeGreaterThan(0);
    expect(SHARE_FORMAT_VERSION).toBeGreaterThan(0);
    expect(SINGLE_EXAMPLE_FORMAT_VERSION).toBeGreaterThan(0);
  });

  it('reserves RULE_VERSION ownership for a future RulePackage', async () => {
    expect(await import('./index')).not.toHaveProperty('RULE_VERSION');
  });
});
