import { describe, expect, it } from 'vitest';

import { commonSimplePatternRecognizerRegistry } from '../../../content/rules/common-simple/pattern-recognizers';
import {
  COMMON_SIMPLE_PATTERN_FACTS,
  COMMON_SIMPLE_UNSUPPORTED_PATTERN_FACTS,
} from '../../../content/rules/common-simple/rule-package';
import { createWinContext } from '../../mahjong/context';
import { createHandSnapshot } from '../../mahjong/hand';
import type { PlacedWinningDecomposition } from '../structure/winning-tile-placement';
import { deriveFacts } from './derived-facts';
import {
  createPatternRecognizerRegistry,
  PatternRecognizerUnavailableError,
  recognizePlacedCandidates,
  recognizePatterns,
} from './pattern-recognizer';

const patterns = COMMON_SIMPLE_PATTERN_FACTS.map(([patternId, name, value, enabled]) => ({
  patternId,
  name,
  recognizerKey: `recognizer.${patternId}`,
  ...(enabled
    ? {}
    : {
        recognizerParams: {
          requiredStructureKey: COMMON_SIMPLE_UNSUPPORTED_PATTERN_FACTS[patternId],
        },
      }),
  value,
  unit: 'fan',
  enabled,
  sourceRefs: ['SRC-A01'],
}));
const structures = [
  {
    structureKey: 'seven-star-unrelated',
    enabled: false,
    supportStatus: 'NOT_SUPPORTED_IN_V0_1',
    reasonCode: 'STRUCTURE_NOT_IMPLEMENTED',
  },
  {
    structureKey: 'all-unrelated',
    enabled: false,
    supportStatus: 'NOT_SUPPORTED_IN_V0_1',
    reasonCode: 'STRUCTURE_NOT_IMPLEMENTED',
  },
  {
    structureKey: 'knitted-straight',
    enabled: false,
    supportStatus: 'NOT_SUPPORTED_IN_V0_1',
    reasonCode: 'STRUCTURE_NOT_IMPLEMENTED',
  },
] as const;
const hand = createHandSnapshot({
  concealed: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'p2', 'p3', 'p4', 's5'],
  winningTile: 's5',
});
const placed: PlacedWinningDecomposition = {
  decomposition: {
    structureKey: 'standard-meld-pair',
    concealedMelds: [
      { kind: 'sequence', tiles: ['m1', 'm2', 'm3'] },
      { kind: 'sequence', tiles: ['m4', 'm5', 'm6'] },
      { kind: 'sequence', tiles: ['m7', 'm8', 'm9'] },
      { kind: 'sequence', tiles: ['p2', 'p3', 'p4'] },
    ],
    pair: { kind: 'pair', tile: 's5' },
    declaredMelds: [],
  },
  winningTilePlacement: { kind: 'pair', tile: 's5' },
};

describe('PatternRecognizer Registry', () => {
  it('contains one trusted implementation for every one of the 78 enabled patterns', () => {
    const enabledKeys = patterns
      .filter(({ enabled }) => enabled)
      .map(({ recognizerKey }) => recognizerKey);
    expect(commonSimplePatternRecognizerRegistry.recognizers).toHaveLength(78);
    expect(
      new Set(
        commonSimplePatternRecognizerRegistry.recognizers.map(({ recognizerKey }) => recognizerKey),
      ),
    ).toEqual(new Set(enabledKeys));
  });

  it('returns Evidence and explicit unsupported semantics without registering the 3 disabled patterns', () => {
    const facts = deriveFacts(hand, createWinContext('discard'), placed);
    const result = recognizePatterns(
      patterns,
      structures,
      commonSimplePatternRecognizerRegistry,
      facts,
    );

    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates.every(({ evidence }) => evidence.length > 0)).toBe(true);
    expect(result.unsupportedPatterns).toEqual([
      {
        patternId: 'greaterHonorsAndKnittedTiles',
        reasonCode: 'STRUCTURE_NOT_IMPLEMENTED',
        structureKey: 'seven-star-unrelated',
      },
      {
        patternId: 'lesserHonorsAndKnittedTiles',
        reasonCode: 'STRUCTURE_NOT_IMPLEMENTED',
        structureKey: 'all-unrelated',
      },
      {
        patternId: 'knittedStraight',
        reasonCode: 'STRUCTURE_NOT_IMPLEMENTED',
        structureKey: 'knitted-straight',
      },
    ]);
  });

  it('rejects duplicate registry keys and fails closed for an unavailable enabled recognizer', () => {
    expect(() =>
      createPatternRecognizerRegistry([
        { recognizerKey: 'recognizer.same', recognize: () => [] },
        { recognizerKey: 'recognizer.same', recognize: () => [] },
      ]),
    ).toThrow(RangeError);
    expect(() =>
      recognizePatterns(
        patterns,
        structures,
        createPatternRecognizerRegistry([]),
        deriveFacts(hand, createWinContext(), placed),
      ),
    ).toThrow(PatternRecognizerUnavailableError);
  });

  it('recognizes every M3 decomposition and Winning Tile Placement without first-candidate short circuiting', () => {
    const secondPlaced: PlacedWinningDecomposition = {
      ...placed,
      winningTilePlacement: { kind: 'sequence', meldIndex: 0, tileIndex: 2 },
    };
    const results = recognizePlacedCandidates(
      hand,
      createWinContext('discard'),
      [placed, secondPlaced],
      patterns,
      structures,
      commonSimplePatternRecognizerRegistry,
    );

    expect(results).toHaveLength(2);
    expect(results.map(({ placed: item }) => item.winningTilePlacement.kind)).toEqual([
      'pair',
      'sequence',
    ]);
    expect(results.every(({ recognition }) => recognition.candidates.length > 0)).toBe(true);
  });
});
