import { describe, expect, it } from 'vitest';

import { createCapabilityRegistry, evaluateRuleCalculationReadiness } from './capability-registry';
import type { PatternDefinition } from './pattern-definition';
import type { RuleManifest } from './rule-manifest';

const patterns: readonly PatternDefinition[] = [
  {
    patternId: 'fixturePattern',
    name: 'Fixture Pattern',
    recognizerKey: 'recognizer.fixturePattern',
    value: 1,
    unit: 'fan',
    enabled: true,
    sourceRefs: ['fixture-source'],
  },
];

function manifest(
  requiredCapabilities: readonly string[],
  status: RuleManifest['status'] = 'test',
): Pick<RuleManifest, 'status' | 'engineCompatibility'> {
  return {
    status,
    engineCompatibility: {
      minEngineVersion: '0.0.0',
      requiredCapabilities,
    },
  };
}

describe('Capability Registry', () => {
  it('allows calculation only when status and every capability reference are trusted', () => {
    const registry = createCapabilityRegistry([
      { capabilityKey: 'recognizer.fixturePattern', kind: 'recognizer' },
    ]);
    const readiness = evaluateRuleCalculationReadiness(
      registry,
      manifest(['recognizer.fixturePattern']),
      patterns,
    );

    expect(readiness).toEqual({ canCalculate: true, blocks: [] });
  });

  it('blocks development rules and unknown manifest or recognizer capabilities', () => {
    const registry = createCapabilityRegistry([]);
    const readiness = evaluateRuleCalculationReadiness(
      registry,
      manifest(['structure.missing'], 'development'),
      patterns,
    );

    expect(readiness.canCalculate).toBe(false);
    expect(readiness.blocks.map(({ reasonCode }) => reasonCode)).toEqual([
      'RULE_STATUS_NOT_CALCULABLE',
      'UNKNOWN_CAPABILITY',
      'UNKNOWN_CAPABILITY',
    ]);
  });

  it('blocks recognizer capabilities with the wrong kind or missing manifest declaration', () => {
    const registry = createCapabilityRegistry([
      { capabilityKey: 'recognizer.fixturePattern', kind: 'scoring' },
    ]);
    const readiness = evaluateRuleCalculationReadiness(registry, manifest([]), patterns);

    expect(readiness.canCalculate).toBe(false);
    expect(readiness.blocks.map(({ reasonCode }) => reasonCode)).toEqual([
      'CAPABILITY_KIND_MISMATCH',
      'PATTERN_CAPABILITY_NOT_DECLARED',
    ]);
  });

  it('rejects malformed or duplicate trusted registry entries', () => {
    expect(() => createCapabilityRegistry([{ capabilityKey: '   ', kind: 'recognizer' }])).toThrow(
      RangeError,
    );
    expect(() =>
      createCapabilityRegistry([
        { capabilityKey: 'recognizer.duplicate', kind: 'recognizer' },
        { capabilityKey: 'recognizer.duplicate', kind: 'recognizer' },
      ]),
    ).toThrow(RangeError);
  });
});
