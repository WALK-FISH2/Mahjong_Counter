import {
  createPatternRecognizerRegistry,
  evidence,
  type DerivedFacts,
  type DerivedMeldFact,
  type PatternEvidence,
  type PatternRecognizer,
} from '../../../domain/engine/pattern/index';
import { getTileMetadata, type TileCode, type TileSuit } from '../../../domain/mahjong/tile';

type RecognizerPredicate = (facts: DerivedFacts) => readonly PatternEvidence[];

const WIND_TILES = new Set<TileCode>(['east', 'south', 'west', 'north']);
const DRAGON_TILES = new Set<TileCode>(['red', 'green', 'white']);
const GREEN_TILES = new Set<TileCode>(['s2', 's3', 's4', 's6', 's8', 'green']);
const REVERSIBLE_TILES = new Set<TileCode>([
  'p1',
  'p2',
  'p3',
  'p4',
  'p5',
  'p8',
  'p9',
  's2',
  's4',
  's5',
  's6',
  's8',
  's9',
  'white',
]);
const ALL_SUITS: readonly TileSuit[] = ['characters', 'dots', 'bamboo'];

function one(
  type: string,
  facts: Record<string, boolean | number | string>,
): readonly PatternEvidence[] {
  return Object.freeze([evidence(type, facts)]);
}

function yes(
  condition: boolean,
  type: string,
  facts: Record<string, boolean | number | string> = {},
): readonly PatternEvidence[] {
  return condition ? one(type, facts) : Object.freeze([]);
}

function many(
  count: number,
  type: string,
  facts: Record<string, boolean | number | string> = {},
): readonly PatternEvidence[] {
  return Object.freeze(
    Array.from({ length: count }, (_, index) =>
      evidence(type, { ...facts, occurrence: index + 1 }),
    ),
  );
}

function isSuited(tile: TileCode): boolean {
  return getTileMetadata(tile).kind === 'suited';
}

function rankOf(tile: TileCode): number | null {
  const metadata = getTileMetadata(tile);
  return metadata.kind === 'suited' ? metadata.rank : null;
}

function isTerminal(tile: TileCode): boolean {
  const rank = rankOf(tile);
  return rank === 1 || rank === 9;
}

function isHonor(tile: TileCode): boolean {
  return getTileMetadata(tile).kind === 'honor';
}

function isTerminalOrHonor(tile: TileCode): boolean {
  return isTerminal(tile) || isHonor(tile);
}

function allTiles(facts: DerivedFacts, predicate: (tile: TileCode) => boolean): boolean {
  return facts.allTiles.length > 0 && facts.allTiles.every(predicate);
}

function pungsMatching(
  facts: DerivedFacts,
  predicate: (meld: DerivedMeldFact) => boolean,
): readonly DerivedMeldFact[] {
  return facts.pungLikeMelds.filter(predicate);
}

function sequencesAt(
  facts: DerivedFacts,
  suit: TileSuit,
  startRank: number,
): readonly DerivedMeldFact[] {
  return facts.sequences.filter((meld) => meld.suit === suit && meld.rank === startRank);
}

function sequenceStarts(facts: DerivedFacts, suit: TileSuit): readonly number[] {
  return facts.sequences
    .filter((meld) => meld.suit === suit && meld.rank !== null)
    .map(({ rank }) => rank as number)
    .sort((left, right) => left - right);
}

function containsProgression(
  values: readonly number[],
  length: number,
  steps: readonly number[],
): boolean {
  const valueSet = new Set(values);
  return values.some((start) =>
    steps.some((step) =>
      Array.from({ length }, (_, index) => start + index * step).every((value) =>
        valueSet.has(value),
      ),
    ),
  );
}

function knownContext(facts: DerivedFacts, contextId: string): boolean | number | string | null {
  if (contextId === 'winMode') {
    return facts.context.mode;
  }
  const value = facts.context.values[contextId];
  return value?.status === 'known' ? value.value : null;
}

function contextTrue(facts: DerivedFacts, contextId: string): boolean {
  return knownContext(facts, contextId) === true;
}

function standard(facts: DerivedFacts): boolean {
  return facts.structureKey === 'standard-meld-pair';
}

function pattern(patternId: string, recognize: RecognizerPredicate): PatternRecognizer {
  return Object.freeze({
    recognizerKey: `recognizer.${patternId}`,
    recognize: ({ facts }) => recognize(facts),
  });
}

const RECOGNIZERS: readonly PatternRecognizer[] = [
  pattern('bigFourWinds', (facts) =>
    yes(
      pungsMatching(facts, ({ primaryTile }) => WIND_TILES.has(primaryTile)).length === 4,
      'wind-pungs',
      { count: 4 },
    ),
  ),
  pattern('bigThreeDragons', (facts) =>
    yes(
      pungsMatching(facts, ({ primaryTile }) => DRAGON_TILES.has(primaryTile)).length === 3,
      'dragon-pungs',
      { count: 3 },
    ),
  ),
  pattern('allGreen', (facts) =>
    yes(
      allTiles(facts, (tile) => GREEN_TILES.has(tile)),
      'allowed-tile-set',
    ),
  ),
  pattern('nineGates', (facts) => {
    if (
      !facts.isConcealedHand ||
      facts.suits.length !== 1 ||
      facts.hasHonors ||
      facts.allTiles.length !== 14
    ) {
      return Object.freeze([]);
    }
    const suit = facts.suits[0];
    if (suit === undefined) return Object.freeze([]);
    const counts = new Map<number, number>();
    facts.allTiles.forEach((tile) => {
      const metadata = getTileMetadata(tile);
      if (metadata.kind === 'suited' && metadata.suit === suit)
        counts.set(metadata.rank, (counts.get(metadata.rank) ?? 0) + 1);
    });
    return yes(
      [1, 9].every((rank) => (counts.get(rank) ?? 0) >= 3) &&
        [2, 3, 4, 5, 6, 7, 8].every((rank) => (counts.get(rank) ?? 0) >= 1),
      'nine-gates-counts',
      { suit },
    );
  }),
  pattern('fourKongs', (facts) => yes(facts.kongs.length === 4, 'kong-count', { count: 4 })),
  pattern('sevenShiftedPairs', (facts) => {
    if (facts.structureKey !== 'seven-pairs' || facts.suits.length !== 1 || facts.hasHonors)
      return Object.freeze([]);
    const ranks = facts.pairTiles
      .map(rankOf)
      .filter((rank): rank is number => rank !== null)
      .sort((a, b) => a - b);
    return yes(
      ranks.length === 7 && ranks.every((rank, index) => index === 0 || rank === ranks[0]! + index),
      'shifted-pairs',
    );
  }),
  pattern('thirteenOrphans', (facts) =>
    yes(facts.structureKey === 'thirteen-orphans', 'structure', {
      structureKey: facts.structureKey,
    }),
  ),
  pattern('allTerminals', (facts) =>
    yes(
      standard(facts) && facts.sequences.length === 0 && allTiles(facts, isTerminal),
      'terminal-only',
    ),
  ),
  pattern('littleFourWinds', (facts) =>
    yes(
      pungsMatching(facts, ({ primaryTile }) => WIND_TILES.has(primaryTile)).length === 3 &&
        facts.pairTile !== null &&
        WIND_TILES.has(facts.pairTile),
      'wind-pungs-and-pair',
    ),
  ),
  pattern('littleThreeDragons', (facts) =>
    yes(
      pungsMatching(facts, ({ primaryTile }) => DRAGON_TILES.has(primaryTile)).length === 2 &&
        facts.pairTile !== null &&
        DRAGON_TILES.has(facts.pairTile),
      'dragon-pungs-and-pair',
    ),
  ),
  pattern('allHonors', (facts) => yes(allTiles(facts, isHonor), 'honor-only')),
  pattern('fourConcealedPungs', (facts) =>
    yes(facts.concealedPungCount === 4, 'concealed-pung-count', { count: 4 }),
  ),
  pattern('pureTerminalChows', (facts) => {
    const suit = facts.suits[0];
    return yes(
      standard(facts) &&
        suit !== undefined &&
        facts.suits.length === 1 &&
        !facts.hasHonors &&
        sequencesAt(facts, suit, 1).length === 2 &&
        sequencesAt(facts, suit, 7).length === 2 &&
        rankOf(facts.pairTile!) === 5,
      'terminal-chow-shape',
      suit === undefined ? {} : { suit },
    );
  }),
  pattern('quadrupleChow', (facts) =>
    yes(
      ALL_SUITS.some((suit) =>
        [1, 2, 3, 4, 5, 6, 7].some((rank) => sequencesAt(facts, suit, rank).length === 4),
      ),
      'identical-chows',
      { count: 4 },
    ),
  ),
  pattern('fourPureShiftedPungs', (facts) =>
    yes(
      ALL_SUITS.some((suit) =>
        containsProgression(
          pungsMatching(facts, (meld) => meld.suit === suit).map(({ rank }) => rank as number),
          4,
          [1],
        ),
      ),
      'shifted-pungs',
      { count: 4 },
    ),
  ),
  pattern('fourPureShiftedChows', (facts) =>
    yes(
      ALL_SUITS.some((suit) => containsProgression(sequenceStarts(facts, suit), 4, [1, 2])),
      'shifted-chows',
      { count: 4 },
    ),
  ),
  pattern('threeKongs', (facts) => yes(facts.kongs.length === 3, 'kong-count', { count: 3 })),
  pattern('allTerminalsAndHonors', (facts) =>
    yes(
      standard(facts) &&
        facts.sequences.length === 0 &&
        allTiles(facts, isTerminalOrHonor) &&
        facts.hasHonors &&
        facts.allTiles.some(isTerminal),
      'terminal-honor-only',
    ),
  ),
  pattern('sevenPairs', (facts) =>
    yes(facts.structureKey === 'seven-pairs', 'structure', { structureKey: facts.structureKey }),
  ),
  pattern('allEvenPungs', (facts) =>
    yes(
      standard(facts) &&
        facts.sequences.length === 0 &&
        allTiles(facts, (tile) => {
          const rank = rankOf(tile);
          return rank !== null && rank % 2 === 0;
        }),
      'even-pungs',
    ),
  ),
  pattern('fullFlush', (facts) =>
    yes(facts.suits.length === 1 && !facts.hasHonors, 'single-suit', {
      suit: facts.suits[0] ?? '',
    }),
  ),
  pattern('pureTripleChow', (facts) =>
    yes(
      ALL_SUITS.some((suit) =>
        [1, 2, 3, 4, 5, 6, 7].some((rank) => sequencesAt(facts, suit, rank).length >= 3),
      ),
      'identical-chows',
      { count: 3 },
    ),
  ),
  pattern('pureShiftedPungs', (facts) =>
    yes(
      ALL_SUITS.some((suit) =>
        containsProgression(
          pungsMatching(facts, (meld) => meld.suit === suit).map(({ rank }) => rank as number),
          3,
          [1],
        ),
      ),
      'shifted-pungs',
      { count: 3 },
    ),
  ),
  pattern('upperTiles', (facts) =>
    yes(
      allTiles(facts, (tile) => {
        const rank = rankOf(tile);
        return rank !== null && rank >= 7;
      }),
      'rank-range',
      { minimum: 7, maximum: 9 },
    ),
  ),
  pattern('middleTiles', (facts) =>
    yes(
      allTiles(facts, (tile) => {
        const rank = rankOf(tile);
        return rank !== null && rank >= 4 && rank <= 6;
      }),
      'rank-range',
      { minimum: 4, maximum: 6 },
    ),
  ),
  pattern('lowerTiles', (facts) =>
    yes(
      allTiles(facts, (tile) => {
        const rank = rankOf(tile);
        return rank !== null && rank <= 3;
      }),
      'rank-range',
      { minimum: 1, maximum: 3 },
    ),
  ),
  pattern('pureStraight', (facts) =>
    yes(
      ALL_SUITS.some((suit) =>
        [1, 4, 7].every((rank) => sequencesAt(facts, suit, rank).length > 0),
      ),
      'straight',
    ),
  ),
  pattern('threeSuitedTerminalChows', (facts) => {
    const pairSuit = facts.pairTile === null ? null : getTileMetadata(facts.pairTile);
    if (pairSuit?.kind !== 'suited' || pairSuit.rank !== 5) return Object.freeze([]);
    return yes(
      ALL_SUITS.filter((suit) => suit !== pairSuit.suit).every(
        (suit) => sequencesAt(facts, suit, 1).length > 0 && sequencesAt(facts, suit, 7).length > 0,
      ),
      'three-suited-terminal-chows',
    );
  }),
  pattern('pureShiftedChows', (facts) =>
    yes(
      ALL_SUITS.some((suit) => containsProgression(sequenceStarts(facts, suit), 3, [1, 2])),
      'shifted-chows',
      { count: 3 },
    ),
  ),
  pattern('allFives', (facts) =>
    yes(
      standard(facts) &&
        facts.pairTile !== null &&
        rankOf(facts.pairTile) === 5 &&
        facts.melds.every((meld) => meld.tiles.some((tile) => rankOf(tile) === 5)),
      'five-in-every-group',
    ),
  ),
  pattern('triplePung', (facts) =>
    yes(
      [1, 2, 3, 4, 5, 6, 7, 8, 9].some((rank) =>
        ALL_SUITS.every(
          (suit) =>
            pungsMatching(facts, (meld) => meld.suit === suit && meld.rank === rank).length > 0,
        ),
      ),
      'same-rank-pungs',
    ),
  ),
  pattern('threeConcealedPungs', (facts) =>
    yes(facts.concealedPungCount === 3, 'concealed-pung-count', { count: 3 }),
  ),
  pattern('upperFour', (facts) =>
    yes(
      allTiles(facts, (tile) => {
        const rank = rankOf(tile);
        return rank !== null && rank >= 6;
      }),
      'rank-range',
      { minimum: 6, maximum: 9 },
    ),
  ),
  pattern('lowerFour', (facts) =>
    yes(
      allTiles(facts, (tile) => {
        const rank = rankOf(tile);
        return rank !== null && rank <= 4;
      }),
      'rank-range',
      { minimum: 1, maximum: 4 },
    ),
  ),
  pattern('bigThreeWinds', (facts) =>
    yes(
      pungsMatching(facts, ({ primaryTile }) => WIND_TILES.has(primaryTile)).length === 3,
      'wind-pungs',
      { count: 3 },
    ),
  ),
  pattern('mixedStraight', (facts) =>
    yes(
      ALL_SUITS.some((s1) =>
        ALL_SUITS.some((s2) =>
          ALL_SUITS.some(
            (s3) =>
              new Set([s1, s2, s3]).size === 3 &&
              sequencesAt(facts, s1, 1).length > 0 &&
              sequencesAt(facts, s2, 4).length > 0 &&
              sequencesAt(facts, s3, 7).length > 0,
          ),
        ),
      ),
      'mixed-straight',
    ),
  ),
  pattern('reversibleTiles', (facts) =>
    yes(
      allTiles(facts, (tile) => REVERSIBLE_TILES.has(tile)),
      'allowed-tile-set',
    ),
  ),
  pattern('mixedTripleChow', (facts) =>
    yes(
      [1, 2, 3, 4, 5, 6, 7].some((rank) =>
        ALL_SUITS.every((suit) => sequencesAt(facts, suit, rank).length > 0),
      ),
      'mixed-identical-chows',
    ),
  ),
  pattern('mixedShiftedPungs', (facts) =>
    yes(
      pungsMatching(facts, ({ suit }) => suit !== null).some((first) =>
        pungsMatching(
          facts,
          ({ suit, rank }) => suit !== null && suit !== first.suit && rank === first.rank! + 1,
        ).some(
          (second) =>
            pungsMatching(
              facts,
              ({ suit, rank }) =>
                suit !== null &&
                suit !== first.suit &&
                suit !== second.suit &&
                rank === first.rank! + 2,
            ).length > 0,
        ),
      ),
      'mixed-shifted-pungs',
    ),
  ),
  pattern('chickenHand', () => one('fallback-if-no-other', {})),
  pattern('lastTileDraw', (facts) =>
    yes(facts.context.mode === 'self-draw' && contextTrue(facts, 'wallLastDraw'), 'context', {
      contextId: 'wallLastDraw',
    }),
  ),
  pattern('lastTileClaim', (facts) =>
    yes(
      facts.context.mode === 'discard' && contextTrue(facts, 'lastDiscardAfterWallExhausted'),
      'context',
      { contextId: 'lastDiscardAfterWallExhausted' },
    ),
  ),
  pattern('outWithReplacementTile', (facts) =>
    yes(
      facts.context.mode === 'self-draw' && contextTrue(facts, 'afterKongReplacement'),
      'context',
      { contextId: 'afterKongReplacement' },
    ),
  ),
  pattern('robbingTheKong', (facts) =>
    yes(facts.context.mode === 'discard' && contextTrue(facts, 'robbingAddedKong'), 'context', {
      contextId: 'robbingAddedKong',
    }),
  ),
  pattern('allPungs', (facts) =>
    yes(
      standard(facts) && facts.sequences.length === 0 && facts.pungLikeMelds.length > 0,
      'pung-only',
    ),
  ),
  pattern('halfFlush', (facts) =>
    yes(facts.suits.length === 1 && facts.hasHonors, 'single-suit-with-honors', {
      suit: facts.suits[0] ?? '',
    }),
  ),
  pattern('mixedShiftedChows', (facts) =>
    yes(
      facts.sequences.some((first) =>
        facts.sequences.some(
          (second) =>
            second.suit !== first.suit &&
            second.rank === first.rank! + 1 &&
            facts.sequences.some(
              (third) =>
                third.suit !== first.suit &&
                third.suit !== second.suit &&
                third.rank === first.rank! + 2,
            ),
        ),
      ),
      'mixed-shifted-chows',
    ),
  ),
  pattern('allTypes', (facts) =>
    yes(facts.suits.length === 3 && facts.hasWinds && facts.hasDragons, 'five-types'),
  ),
  pattern('meldedHand', (facts) =>
    yes(
      standard(facts) &&
        facts.openDeclaredMeldCount === 4 &&
        facts.context.mode === 'discard' &&
        facts.waitKind === 'single',
      'fully-melded-discard',
    ),
  ),
  pattern('twoConcealedKongs', (facts) =>
    yes(
      facts.kongs.filter(({ exposure }) => exposure === 'concealed').length === 2,
      'concealed-kong-count',
      { count: 2 },
    ),
  ),
  pattern('twoDragonPungs', (facts) =>
    yes(
      pungsMatching(facts, ({ primaryTile }) => DRAGON_TILES.has(primaryTile)).length === 2,
      'dragon-pungs',
      { count: 2 },
    ),
  ),
  pattern('outsideHand', (facts) =>
    yes(
      standard(facts) &&
        facts.pairTile !== null &&
        isTerminalOrHonor(facts.pairTile) &&
        facts.melds.every((meld) => meld.tiles.some(isTerminalOrHonor)),
      'terminal-or-honor-every-group',
    ),
  ),
  pattern('fullyConcealedHand', (facts) =>
    yes(facts.isConcealedHand && facts.context.mode === 'self-draw', 'concealed-self-draw'),
  ),
  pattern('twoMeldedKongs', (facts) =>
    yes(facts.kongs.filter(({ exposure }) => exposure === 'open').length === 2, 'open-kong-count', {
      count: 2,
    }),
  ),
  pattern('lastTile', (facts) =>
    yes(contextTrue(facts, 'lastTile'), 'context', { contextId: 'lastTile' }),
  ),
  pattern('dragonPung', (facts) =>
    many(
      pungsMatching(facts, ({ primaryTile }) => DRAGON_TILES.has(primaryTile)).length,
      'dragon-pung',
    ),
  ),
  pattern('prevalentWind', (facts) =>
    yes(
      typeof knownContext(facts, 'roundWind') === 'string' &&
        pungsMatching(facts, ({ primaryTile }) => primaryTile === knownContext(facts, 'roundWind'))
          .length > 0,
      'round-wind-pung',
    ),
  ),
  pattern('seatWind', (facts) =>
    yes(
      typeof knownContext(facts, 'seatWind') === 'string' &&
        pungsMatching(facts, ({ primaryTile }) => primaryTile === knownContext(facts, 'seatWind'))
          .length > 0,
      'seat-wind-pung',
    ),
  ),
  pattern('concealedHand', (facts) =>
    yes(facts.isConcealedHand && facts.context.mode === 'discard', 'concealed-discard'),
  ),
  pattern('allChows', (facts) =>
    yes(
      standard(facts) &&
        facts.melds.length > 0 &&
        facts.sequences.length === facts.melds.length &&
        facts.pairTile !== null &&
        isSuited(facts.pairTile) &&
        facts.waitKind === 'other',
      'all-chows-open-wait',
    ),
  ),
  pattern('tileHog', (facts) =>
    many(
      Object.entries(facts.tileCounts).filter(
        ([tile, count]) =>
          count === 4 && !facts.kongs.some(({ primaryTile }) => primaryTile === tile),
      ).length,
      'four-copies-not-kong',
    ),
  ),
  pattern('doublePung', (facts) => {
    let count = 0;
    for (const rank of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const suits = new Set(
        pungsMatching(facts, (meld) => meld.rank === rank && meld.suit !== null).map(
          ({ suit }) => suit,
        ),
      );
      count += (suits.size * (suits.size - 1)) / 2;
    }
    return many(count, 'same-rank-pung-pair');
  }),
  pattern('twoConcealedPungs', (facts) =>
    yes(facts.concealedPungCount === 2, 'concealed-pung-count', { count: 2 }),
  ),
  pattern('concealedKong', (facts) =>
    many(facts.kongs.filter(({ exposure }) => exposure === 'concealed').length, 'concealed-kong'),
  ),
  pattern('allSimples', (facts) =>
    yes(
      allTiles(facts, (tile) => {
        const rank = rankOf(tile);
        return rank !== null && rank >= 2 && rank <= 8;
      }),
      'simple-tiles-only',
    ),
  ),
  pattern('pureDoubleChow', (facts) => {
    const count = ALL_SUITS.reduce(
      (total, suit) =>
        total +
        [1, 2, 3, 4, 5, 6, 7].reduce(
          (sub, rank) => sub + Math.floor(sequencesAt(facts, suit, rank).length / 2),
          0,
        ),
      0,
    );
    return many(count, 'identical-chow-pair');
  }),
  pattern('mixedDoubleChow', (facts) => {
    let count = 0;
    for (const rank of [1, 2, 3, 4, 5, 6, 7]) {
      const suitCount = ALL_SUITS.filter(
        (suit) => sequencesAt(facts, suit, rank).length > 0,
      ).length;
      count += (suitCount * (suitCount - 1)) / 2;
    }
    return many(count, 'mixed-identical-chow-pair');
  }),
  pattern('shortStraight', (facts) =>
    many(
      ALL_SUITS.reduce(
        (total, suit) =>
          total +
          [1, 2, 3, 4].filter(
            (rank) =>
              sequencesAt(facts, suit, rank).length > 0 &&
              sequencesAt(facts, suit, rank + 3).length > 0,
          ).length,
        0,
      ),
      'short-straight',
    ),
  ),
  pattern('twoTerminalChows', (facts) =>
    many(
      ALL_SUITS.filter(
        (suit) => sequencesAt(facts, suit, 1).length > 0 && sequencesAt(facts, suit, 7).length > 0,
      ).length,
      'terminal-chow-pair',
    ),
  ),
  pattern('pungOfTerminalsOrHonors', (facts) => {
    const roundWind = knownContext(facts, 'roundWind');
    const seatWind = knownContext(facts, 'seatWind');
    return many(
      pungsMatching(
        facts,
        ({ primaryTile }) =>
          isTerminal(primaryTile) ||
          (WIND_TILES.has(primaryTile) &&
            typeof roundWind === 'string' &&
            typeof seatWind === 'string' &&
            primaryTile !== roundWind &&
            primaryTile !== seatWind),
      ).length,
      'terminal-or-nonvalue-wind-pung',
    );
  }),
  pattern('meldedKong', (facts) =>
    many(facts.kongs.filter(({ exposure }) => exposure === 'open').length, 'open-kong'),
  ),
  pattern('oneVoidedSuit', (facts) =>
    yes(facts.suits.length === 2, 'used-suit-count', { count: 2 }),
  ),
  pattern('noHonors', (facts) => yes(!facts.hasHonors, 'no-honors')),
  pattern('edgeWait', (facts) => yes(facts.waitKind === 'edge', 'wait', { waitKind: 'edge' })),
  pattern('closedWait', (facts) =>
    yes(facts.waitKind === 'closed', 'wait', { waitKind: 'closed' }),
  ),
  pattern('singleWait', (facts) =>
    yes(facts.waitKind === 'single', 'wait', { waitKind: 'single' }),
  ),
  pattern('selfDrawn', (facts) =>
    yes(facts.context.mode === 'self-draw', 'win-mode', { mode: 'self-draw' }),
  ),
  pattern('flowerTiles', (facts) => many(facts.flowerCount, 'fallback-ignored-extra')),
];

export const commonSimplePatternRecognizerRegistry = createPatternRecognizerRegistry(RECOGNIZERS);
