import { describe, expect, it } from 'vitest';

import type {
  DerivedFacts,
  DerivedMeldFact,
  PatternRecognizer,
} from '../../../domain/engine/pattern/index';
import type { PlacedWinningDecomposition } from '../../../domain/engine/structure/winning-tile-placement';
import { createWinContext, knownContextValue } from '../../../domain/mahjong/context';
import { createHandSnapshot } from '../../../domain/mahjong/hand';
import { getTileMetadata, type TileCode } from '../../../domain/mahjong/tile';
import { parseRulePackageDefinition } from '../../../schemas/rule-package/rule-package-definition-schema';
import { commonSimpleRulePackageInput } from './rule-package';
import { commonSimplePatternRecognizerRegistry } from './pattern-recognizers';

const rule = parseRulePackageDefinition(commonSimpleRulePackageInput);
const emptyPlaced: PlacedWinningDecomposition = {
  decomposition: {
    structureKey: 'standard-meld-pair',
    concealedMelds: [],
    pair: { kind: 'pair', tile: 'm2' },
    declaredMelds: [],
  },
  winningTilePlacement: { kind: 'pair', tile: 'm2' },
};

function meld(
  kind: DerivedMeldFact['kind'],
  tile: TileCode,
  exposure: DerivedMeldFact['exposure'] = 'concealed',
): DerivedMeldFact {
  const metadata = getTileMetadata(tile);
  const tiles =
    kind === 'sequence' && metadata.kind === 'suited'
      ? ([
          tile,
          `${tile[0]}${metadata.rank + 1}` as TileCode,
          `${tile[0]}${metadata.rank + 2}` as TileCode,
        ] as const)
      : Array.from({ length: kind === 'kong' ? 4 : 3 }, () => tile);
  return Object.freeze({
    kind,
    tiles: Object.freeze(tiles),
    primaryTile: tile,
    suit: metadata.kind === 'suited' ? metadata.suit : null,
    rank: metadata.kind === 'suited' ? metadata.rank : null,
    exposure,
    declared: exposure === 'open',
    completedByWinningTile: false,
  });
}

const seq = (suit: 'm' | 'p' | 's', rank: number): DerivedMeldFact =>
  meld('sequence', `${suit}${rank}` as TileCode);
const pung = (tile: TileCode, exposure: 'concealed' | 'open' = 'concealed'): DerivedMeldFact =>
  meld('triplet', tile, exposure);
const kong = (tile: TileCode, exposure: 'concealed' | 'open'): DerivedMeldFact =>
  meld('kong', tile, exposure);

function facts(overrides: Partial<DerivedFacts> = {}): DerivedFacts {
  const melds = overrides.melds ?? [];
  const allTiles = overrides.allTiles ?? [];
  return Object.freeze({
    hand: createHandSnapshot(),
    context: createWinContext('discard'),
    placed: emptyPlaced,
    structureKey: 'standard-meld-pair',
    allTiles: Object.freeze(allTiles),
    tileCounts: Object.freeze({}),
    suits: Object.freeze([]),
    honorTiles: Object.freeze([]),
    hasHonors: false,
    hasWinds: false,
    hasDragons: false,
    melds: Object.freeze(melds),
    sequences: Object.freeze(melds.filter(({ kind }) => kind === 'sequence')),
    pungLikeMelds: Object.freeze(melds.filter(({ kind }) => kind !== 'sequence')),
    kongs: Object.freeze(melds.filter(({ kind }) => kind === 'kong')),
    concealedPungCount: melds.filter(
      ({ kind, exposure }) => kind !== 'sequence' && exposure === 'concealed',
    ).length,
    pairTile: 'm2',
    pairTiles: Object.freeze<TileCode[]>(['m2']),
    isConcealedHand: true,
    openDeclaredMeldCount: melds.filter(({ exposure }) => exposure === 'open').length,
    waitKind: 'other',
    flowerCount: 0,
    ...overrides,
  });
}

function tiles(suit: 'm' | 'p' | 's', ranks: readonly number[]): readonly TileCode[] {
  return ranks.map((rank) => `${suit}${rank}` as TileCode);
}

const winds = [pung('east'), pung('south'), pung('west'), pung('north')];
const dragons = [pung('red'), pung('green'), pung('white')];
const standardPungs = [pung('m2'), pung('p4'), pung('s6'), pung('east')];
const positiveFacts: Readonly<Record<string, DerivedFacts>> = {
  bigFourWinds: facts({ melds: winds }),
  bigThreeDragons: facts({ melds: dragons }),
  allGreen: facts({ allTiles: ['s2', 's3', 's4', 's6', 's8', 'green'] }),
  nineGates: facts({
    allTiles: tiles('m', [1, 1, 1, 2, 3, 4, 5, 5, 6, 7, 8, 9, 9, 9]),
    suits: ['characters'],
  }),
  fourKongs: facts({
    melds: [
      kong('m1', 'open'),
      kong('m2', 'open'),
      kong('p1', 'concealed'),
      kong('s1', 'concealed'),
    ],
  }),
  sevenShiftedPairs: facts({
    structureKey: 'seven-pairs',
    pairTiles: tiles('m', [1, 2, 3, 4, 5, 6, 7]),
    suits: ['characters'],
  }),
  thirteenOrphans: facts({ structureKey: 'thirteen-orphans' }),
  allTerminals: facts({ allTiles: tiles('m', [1, 9]), melds: [pung('m1'), pung('m9')] }),
  littleFourWinds: facts({ melds: winds.slice(0, 3), pairTile: 'north' }),
  littleThreeDragons: facts({ melds: dragons.slice(0, 2), pairTile: 'white' }),
  allHonors: facts({ allTiles: ['east', 'south', 'red', 'white'] }),
  fourConcealedPungs: facts({ melds: standardPungs }),
  pureTerminalChows: facts({
    melds: [seq('m', 1), seq('m', 1), seq('m', 7), seq('m', 7)],
    pairTile: 'm5',
    suits: ['characters'],
  }),
  quadrupleChow: facts({ melds: [seq('m', 2), seq('m', 2), seq('m', 2), seq('m', 2)] }),
  fourPureShiftedPungs: facts({ melds: [pung('m1'), pung('m2'), pung('m3'), pung('m4')] }),
  fourPureShiftedChows: facts({ melds: [seq('m', 1), seq('m', 2), seq('m', 3), seq('m', 4)] }),
  threeKongs: facts({ melds: [kong('m1', 'open'), kong('p2', 'open'), kong('s3', 'concealed')] }),
  allTerminalsAndHonors: facts({
    allTiles: ['m1', 'm9', 'east', 'red'],
    melds: [pung('m1'), pung('east')],
    hasHonors: true,
  }),
  sevenPairs: facts({ structureKey: 'seven-pairs' }),
  allEvenPungs: facts({
    allTiles: tiles('m', [2, 4, 6, 8]),
    melds: [pung('m2'), pung('m4'), pung('m6'), pung('m8')],
  }),
  fullFlush: facts({ allTiles: tiles('m', [1, 2, 3]), suits: ['characters'] }),
  pureTripleChow: facts({ melds: [seq('m', 3), seq('m', 3), seq('m', 3)] }),
  pureShiftedPungs: facts({ melds: [pung('m3'), pung('m4'), pung('m5')] }),
  upperTiles: facts({ allTiles: tiles('m', [7, 8, 9]) }),
  middleTiles: facts({ allTiles: tiles('m', [4, 5, 6]) }),
  lowerTiles: facts({ allTiles: tiles('m', [1, 2, 3]) }),
  pureStraight: facts({ melds: [seq('m', 1), seq('m', 4), seq('m', 7)] }),
  threeSuitedTerminalChows: facts({
    melds: [seq('m', 1), seq('m', 7), seq('s', 1), seq('s', 7)],
    pairTile: 'p5',
  }),
  pureShiftedChows: facts({ melds: [seq('m', 1), seq('m', 2), seq('m', 3)] }),
  allFives: facts({ melds: [seq('m', 3), seq('p', 4), pung('s5'), seq('m', 5)], pairTile: 'p5' }),
  triplePung: facts({ melds: [pung('m5'), pung('p5'), pung('s5')] }),
  threeConcealedPungs: facts({ melds: [pung('m1'), pung('p2'), pung('s3')] }),
  upperFour: facts({ allTiles: tiles('m', [6, 7, 8, 9]) }),
  lowerFour: facts({ allTiles: tiles('m', [1, 2, 3, 4]) }),
  bigThreeWinds: facts({ melds: winds.slice(0, 3) }),
  mixedStraight: facts({ melds: [seq('m', 1), seq('p', 4), seq('s', 7)] }),
  reversibleTiles: facts({ allTiles: ['p1', 'p2', 'p5', 's2', 's8', 'white'] }),
  mixedTripleChow: facts({ melds: [seq('m', 3), seq('p', 3), seq('s', 3)] }),
  mixedShiftedPungs: facts({ melds: [pung('m2'), pung('p3'), pung('s4')] }),
  chickenHand: facts(),
  lastTileDraw: facts({
    context: createWinContext('self-draw', { wallLastDraw: knownContextValue(true) }),
  }),
  lastTileClaim: facts({
    context: createWinContext('discard', {
      lastDiscardAfterWallExhausted: knownContextValue(true),
    }),
  }),
  outWithReplacementTile: facts({
    context: createWinContext('self-draw', { afterKongReplacement: knownContextValue(true) }),
  }),
  robbingTheKong: facts({
    context: createWinContext('discard', { robbingAddedKong: knownContextValue(true) }),
  }),
  allPungs: facts({ melds: standardPungs }),
  halfFlush: facts({ suits: ['characters'], hasHonors: true }),
  mixedShiftedChows: facts({ melds: [seq('m', 2), seq('p', 3), seq('s', 4)] }),
  allTypes: facts({ suits: ['characters', 'dots', 'bamboo'], hasWinds: true, hasDragons: true }),
  meldedHand: facts({
    melds: [pung('m1', 'open'), pung('p2', 'open'), pung('s3', 'open'), pung('east', 'open')],
    openDeclaredMeldCount: 4,
    isConcealedHand: false,
    waitKind: 'single',
  }),
  twoConcealedKongs: facts({ melds: [kong('m1', 'concealed'), kong('p2', 'concealed')] }),
  twoDragonPungs: facts({ melds: dragons.slice(0, 2) }),
  outsideHand: facts({
    melds: [seq('m', 1), seq('p', 7), pung('east'), pung('s9')],
    pairTile: 'm1',
  }),
  fullyConcealedHand: facts({ context: createWinContext('self-draw'), isConcealedHand: true }),
  twoMeldedKongs: facts({ melds: [kong('m1', 'open'), kong('p2', 'open')] }),
  lastTile: facts({ context: createWinContext('discard', { lastTile: knownContextValue(true) }) }),
  dragonPung: facts({ melds: [pung('red')] }),
  prevalentWind: facts({
    melds: [pung('east')],
    context: createWinContext('discard', { roundWind: knownContextValue('east') }),
  }),
  seatWind: facts({
    melds: [pung('south')],
    context: createWinContext('discard', { seatWind: knownContextValue('south') }),
  }),
  concealedHand: facts({ context: createWinContext('discard'), isConcealedHand: true }),
  allChows: facts({
    melds: [seq('m', 1), seq('m', 4), seq('p', 2), seq('s', 5)],
    pairTile: 'm5',
    waitKind: 'other',
  }),
  tileHog: facts({ tileCounts: { m5: 4 } }),
  doublePung: facts({ melds: [pung('m5'), pung('p5')] }),
  twoConcealedPungs: facts({ melds: [pung('m1'), pung('p2')] }),
  concealedKong: facts({ melds: [kong('m1', 'concealed')] }),
  allSimples: facts({ allTiles: tiles('m', [2, 3, 4, 5, 6, 7, 8]) }),
  pureDoubleChow: facts({ melds: [seq('m', 2), seq('m', 2)] }),
  mixedDoubleChow: facts({ melds: [seq('m', 2), seq('p', 2)] }),
  shortStraight: facts({ melds: [seq('m', 1), seq('m', 4)] }),
  twoTerminalChows: facts({ melds: [seq('m', 1), seq('m', 7)] }),
  pungOfTerminalsOrHonors: facts({ melds: [pung('m1')] }),
  meldedKong: facts({ melds: [kong('m1', 'open')] }),
  oneVoidedSuit: facts({ suits: ['characters', 'dots'] }),
  noHonors: facts({ hasHonors: false }),
  edgeWait: facts({ waitKind: 'edge' }),
  closedWait: facts({ waitKind: 'closed' }),
  singleWait: facts({ waitKind: 'single' }),
  selfDrawn: facts({ context: createWinContext('self-draw') }),
  flowerTiles: facts({ flowerCount: 2 }),
};

const NEGATIVE_CASE_IDS: Readonly<Record<string, keyof typeof positiveFacts>> = {
  bigFourWinds: 'bigThreeWinds',
  bigThreeDragons: 'twoDragonPungs',
  allGreen: 'fullFlush',
  nineGates: 'fullFlush',
  fourKongs: 'threeKongs',
  sevenShiftedPairs: 'sevenPairs',
  thirteenOrphans: 'sevenPairs',
  allTerminals: 'allTerminalsAndHonors',
  littleFourWinds: 'bigThreeWinds',
  littleThreeDragons: 'twoDragonPungs',
  allHonors: 'allTerminalsAndHonors',
  fourConcealedPungs: 'threeConcealedPungs',
  pureTerminalChows: 'pureStraight',
  quadrupleChow: 'pureTripleChow',
  fourPureShiftedPungs: 'pureShiftedPungs',
  fourPureShiftedChows: 'pureShiftedChows',
  threeKongs: 'twoMeldedKongs',
  allTerminalsAndHonors: 'allTerminals',
  sevenPairs: 'allChows',
  allEvenPungs: 'allPungs',
  fullFlush: 'halfFlush',
  pureTripleChow: 'pureDoubleChow',
  pureShiftedPungs: 'triplePung',
  upperTiles: 'upperFour',
  middleTiles: 'allSimples',
  lowerTiles: 'lowerFour',
  pureStraight: 'shortStraight',
  threeSuitedTerminalChows: 'twoTerminalChows',
  pureShiftedChows: 'mixedShiftedChows',
  allFives: 'allChows',
  triplePung: 'doublePung',
  threeConcealedPungs: 'twoConcealedPungs',
  upperFour: 'allSimples',
  lowerFour: 'allSimples',
  bigThreeWinds: 'twoDragonPungs',
  mixedStraight: 'pureStraight',
  reversibleTiles: 'allGreen',
  mixedTripleChow: 'pureTripleChow',
  mixedShiftedPungs: 'pureShiftedPungs',
  lastTileDraw: 'lastTileClaim',
  lastTileClaim: 'lastTileDraw',
  outWithReplacementTile: 'robbingTheKong',
  robbingTheKong: 'outWithReplacementTile',
  allPungs: 'allChows',
  halfFlush: 'fullFlush',
  mixedShiftedChows: 'pureShiftedChows',
  allTypes: 'halfFlush',
  meldedHand: 'fullyConcealedHand',
  twoConcealedKongs: 'concealedKong',
  twoDragonPungs: 'dragonPung',
  outsideHand: 'allPungs',
  fullyConcealedHand: 'concealedHand',
  twoMeldedKongs: 'meldedKong',
  lastTile: 'lastTileClaim',
  dragonPung: 'bigThreeWinds',
  prevalentWind: 'seatWind',
  seatWind: 'prevalentWind',
  concealedHand: 'fullyConcealedHand',
  allChows: 'allPungs',
  tileHog: 'allPungs',
  doublePung: 'dragonPung',
  twoConcealedPungs: 'concealedKong',
  concealedKong: 'meldedKong',
  allSimples: 'upperTiles',
  pureDoubleChow: 'mixedDoubleChow',
  mixedDoubleChow: 'pureDoubleChow',
  shortStraight: 'pureDoubleChow',
  twoTerminalChows: 'shortStraight',
  pungOfTerminalsOrHonors: 'dragonPung',
  meldedKong: 'concealedKong',
  oneVoidedSuit: 'fullFlush',
  noHonors: 'halfFlush',
  edgeWait: 'closedWait',
  closedWait: 'edgeWait',
  singleWait: 'edgeWait',
  selfDrawn: 'concealedHand',
  flowerTiles: 'allChows',
};

function recognizer(patternId: string): PatternRecognizer {
  const result = commonSimplePatternRecognizerRegistry.recognizers.find(
    ({ recognizerKey }) => recognizerKey === `recognizer.${patternId}`,
  );
  if (result === undefined) throw new Error(`Missing fixture recognizer ${patternId}`);
  return result;
}

describe('common-simple Pattern Recognizers', () => {
  it('has an explicit positive DerivedFacts fixture with Evidence for every enabled pattern', () => {
    const enabledIds = rule.patterns
      .filter(({ enabled }) => enabled)
      .map(({ patternId }) => patternId);
    expect(Object.keys(positiveFacts)).toHaveLength(78);
    expect(new Set(Object.keys(positiveFacts))).toEqual(new Set(enabledIds));

    enabledIds.forEach((patternId) => {
      const definition = rule.patterns.find((item) => item.patternId === patternId)!;
      expect(
        recognizer(patternId).recognize({ pattern: definition, facts: positiveFacts[patternId]! }),
        patternId,
      ).not.toHaveLength(0);
    });
  });

  it('has an explicit key negative fixture for every ordinary recognizer', () => {
    expect(Object.keys(NEGATIVE_CASE_IDS)).toHaveLength(77);
    rule.patterns
      .filter(({ enabled, patternId }) => enabled && patternId !== 'chickenHand')
      .forEach((definition) => {
        const negativeCaseId = NEGATIVE_CASE_IDS[definition.patternId];
        expect(negativeCaseId, `${definition.patternId} negative fixture`).toBeDefined();
        expect(
          recognizer(definition.patternId).recognize({
            pattern: definition,
            facts: positiveFacts[negativeCaseId!]!,
          }),
          `${definition.patternId} vs ${negativeCaseId}`,
        ).toHaveLength(0);
      });
  });

  it('contains no Rule ID dispatch or platform reward capability', () => {
    const source = commonSimplePatternRecognizerRegistry.recognizers
      .map(({ recognize }) => recognize.toString())
      .join('\n');
    expect(source).not.toMatch(/ruleId|dealer|roomMultiplier|payment|payout|eval\s*\(/u);
  });
});
