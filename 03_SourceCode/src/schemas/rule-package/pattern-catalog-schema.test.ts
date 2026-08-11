import { describe, expect, it } from 'vitest';

import {
  parsePatternCatalogWithSources,
  patternCatalogWithSourcesSchema,
} from './pattern-catalog-schema';

const sources = [
  {
    sourceId: 'source-primary',
    title: 'Primary Rule Document',
    publisher: 'Rules Association',
    date: '2026-08-11',
    url: 'https://example.test/rules',
    sourceType: 'association',
    note: 'Embedded source summary remains available offline.',
  },
  {
    sourceId: 'source-cross-check',
    title: 'Cross-check Source',
    sourceType: 'corroborating',
  },
] as const;

const patterns = [
  {
    patternId: 'fixturePattern',
    name: 'Fixture Pattern',
    aliases: ['Fixture Alias'],
    recognizerKey: 'recognizer.fixturePattern',
    recognizerParams: {
      requiredKinds: ['suited', 'honor'],
      minimumGroups: 2,
      allowOpen: false,
    },
    value: 8,
    unit: 'fan',
    enabled: true,
    sourceRefs: ['source-primary', 'source-cross-check'],
    confidence: 'high',
  },
  {
    patternId: 'disabledFixturePattern',
    name: 'Disabled Fixture Pattern',
    recognizerKey: 'recognizer.disabledFixturePattern',
    value: 'rule-defined',
    unit: 'fan',
    enabled: false,
    sourceRefs: ['source-primary'],
    confidence: 'disputed',
  },
] as const;

describe('PatternDefinition and RuleSource schemas', () => {
  it('parses data-only patterns, recognizer parameters, and traceable sources', () => {
    const externalInput: unknown = { patterns, sources };
    const parsed = parsePatternCatalogWithSources(externalInput);

    expect(parsed.patterns).toHaveLength(2);
    expect(parsed.patterns[0]?.recognizerParams).toEqual(patterns[0].recognizerParams);
    expect(parsed.sources[0]).toMatchObject({
      sourceId: 'source-primary',
      sourceType: 'association',
    });
  });

  it('rejects unresolved source references and duplicate stable IDs', () => {
    expect(
      patternCatalogWithSourcesSchema.safeParse({
        patterns: [{ ...patterns[0], sourceRefs: ['missing-source'] }],
        sources,
      }).success,
    ).toBe(false);
    expect(
      patternCatalogWithSourcesSchema.safeParse({
        patterns: [patterns[0], { ...patterns[0] }],
        sources,
      }).success,
    ).toBe(false);
    expect(
      patternCatalogWithSourcesSchema.safeParse({
        patterns,
        sources: [sources[0], { ...sources[0] }],
      }).success,
    ).toBe(false);
  });

  it('rejects executable fields, non-JSON values, and unsafe source protocols', () => {
    expect(
      patternCatalogWithSourcesSchema.safeParse({
        patterns: [
          {
            ...patterns[0],
            recognizerParams: { script: 'return eval(input)' },
          },
        ],
        sources,
      }).success,
    ).toBe(false);
    expect(
      patternCatalogWithSourcesSchema.safeParse({
        patterns: [
          {
            ...patterns[0],
            recognizerParams: { predicate: () => true },
          },
        ],
        sources,
      }).success,
    ).toBe(false);
    expect(
      patternCatalogWithSourcesSchema.safeParse({
        patterns: [{ ...patterns[0], scriptUrl: 'https://example.test/rule.js' }],
        sources,
      }).success,
    ).toBe(false);
    expect(
      patternCatalogWithSourcesSchema.safeParse({
        patterns,
        sources: [{ ...sources[0], url: 'javascript:alert(1)' }],
      }).success,
    ).toBe(false);
  });

  it('rejects empty source evidence and excessive recognizer parameter depth', () => {
    let nested: object = { value: true };
    for (let depth = 0; depth < 10; depth += 1) {
      nested = { nested };
    }

    expect(
      patternCatalogWithSourcesSchema.safeParse({
        patterns: [{ ...patterns[0], sourceRefs: [] }],
        sources,
      }).success,
    ).toBe(false);
    expect(
      patternCatalogWithSourcesSchema.safeParse({
        patterns: [{ ...patterns[0], recognizerParams: nested }],
        sources,
      }).success,
    ).toBe(false);
  });
});
