import { describe, expect, it } from 'vitest';

import { PWA_OPTIONS } from '../../pwa.config';

describe('PWA engineering scaffold', () => {
  it('keeps application updates waiting for a future explicit prompt', () => {
    expect(PWA_OPTIONS.registerType).toBe('prompt');
    expect(PWA_OPTIONS.strategies).toBe('injectManifest');
  });

  it('uses temporary non-installable metadata without production caches', () => {
    expect(PWA_OPTIONS.manifest).toBe(false);
    expect(PWA_OPTIONS.injectManifest.globPatterns).toEqual([]);
  });
});
