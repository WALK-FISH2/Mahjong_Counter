import { describe, expect, it } from 'vitest';

import { commonSimpleRulePackage } from '../../src/content/rules/common-simple/parsed-rule-package';
import {
  CORE_ENCYCLOPEDIA_RESOURCE_MANIFEST_FILE,
  createCoreEncyclopediaBundle,
  createCoreEncyclopediaResourceManifest,
  getCoreEncyclopediaFileName,
} from './core-encyclopedia-artifacts';

describe('T810 core encyclopedia build artifacts', () => {
  it('contains the versioned catalog, examples, sources, and stable resource URL', () => {
    const bundle = createCoreEncyclopediaBundle(commonSimpleRulePackage);
    const manifest = createCoreEncyclopediaResourceManifest(commonSimpleRulePackage);

    expect(getCoreEncyclopediaFileName(commonSimpleRulePackage)).toBe(
      'encyclopedia/common-simple@1.0.0.json',
    );
    expect(CORE_ENCYCLOPEDIA_RESOURCE_MANIFEST_FILE).toBe('encyclopedia/offline-resources.json');
    expect(bundle.ruleRef).toEqual({ ruleId: 'common-simple', ruleVersion: '1.0.0' });
    expect(bundle.patterns).toHaveLength(81);
    expect(bundle.encyclopedia.examples).toHaveLength(5);
    expect(bundle.exampleRuleCases).toHaveLength(5);
    const relationCase = bundle.exampleRuleCases.find(
      ({ id }) => id === 'encyclopedia-big-four-winds-relation',
    );
    expect(relationCase?.calculator.hand.melds).toHaveLength(4);
    expect(relationCase?.expected.countedPatternIds).toEqual(['bigFourWinds']);
    expect(bundle.sources).toHaveLength(6);
    expect(manifest.purpose).toBe('m11-service-worker-input');
    expect(manifest.resources[0]?.url).toBe('/encyclopedia/common-simple@1.0.0.json');
    expect(manifest.resources[0]?.kind).toBe('core-encyclopedia');
    expect(manifest.resources[0]?.revision).toMatch(/^[a-f0-9]{64}$/u);
    expect(manifest.generatedFrom.bundleRevision).toBe(manifest.resources[0]?.revision);
  });
});
