import type { HandSnapshot } from '../../mahjong/hand';
import type { WinContext } from '../../mahjong/context';
import type { Meld } from '../../mahjong/meld';
import {
  getTileMetadata,
  type HonorTileCode,
  type TileCode,
  type TileRank,
  type TileSuit,
} from '../../mahjong/tile';
import type { PlacedWinningDecomposition } from '../structure/winning-tile-placement';

export type DerivedMeldFact = Readonly<{
  kind: 'sequence' | 'triplet' | 'kong';
  tiles: readonly TileCode[];
  primaryTile: TileCode;
  suit: TileSuit | null;
  rank: TileRank | null;
  exposure: 'concealed' | 'open';
  declared: boolean;
  completedByWinningTile: boolean;
}>;

export type WaitKind = 'edge' | 'closed' | 'single' | 'other';

export type DerivedFacts = Readonly<{
  hand: HandSnapshot;
  context: WinContext;
  placed: PlacedWinningDecomposition;
  structureKey: PlacedWinningDecomposition['decomposition']['structureKey'];
  allTiles: readonly TileCode[];
  tileCounts: Readonly<Partial<Record<TileCode, number>>>;
  suits: readonly TileSuit[];
  honorTiles: readonly HonorTileCode[];
  hasHonors: boolean;
  hasWinds: boolean;
  hasDragons: boolean;
  melds: readonly DerivedMeldFact[];
  sequences: readonly DerivedMeldFact[];
  pungLikeMelds: readonly DerivedMeldFact[];
  kongs: readonly DerivedMeldFact[];
  concealedPungCount: number;
  pairTile: TileCode | null;
  pairTiles: readonly TileCode[];
  isConcealedHand: boolean;
  openDeclaredMeldCount: number;
  waitKind: WaitKind;
  flowerCount: number;
}>;

function expandDeclaredMeld(meld: Meld): readonly TileCode[] {
  if (meld.type === 'chow') {
    return meld.tiles;
  }
  const count = meld.type === 'kong' ? 4 : 3;
  return Object.freeze(Array.from({ length: count }, () => meld.tile));
}

function meldFact(
  kind: DerivedMeldFact['kind'],
  tiles: readonly TileCode[],
  exposure: DerivedMeldFact['exposure'],
  declared: boolean,
  completedByWinningTile: boolean,
): DerivedMeldFact {
  const primaryTile = tiles[0];
  if (primaryTile === undefined) {
    throw new RangeError('A derived meld must contain at least one tile.');
  }
  const metadata = getTileMetadata(primaryTile);
  return Object.freeze({
    kind,
    tiles: Object.freeze([...tiles]),
    primaryTile,
    suit: metadata.kind === 'suited' ? metadata.suit : null,
    rank: metadata.kind === 'suited' ? metadata.rank : null,
    exposure,
    declared,
    completedByWinningTile,
  });
}

function declaredMeldFact(meld: Meld): DerivedMeldFact {
  if (meld.type === 'chow') {
    return meldFact('sequence', meld.tiles, 'open', true, false);
  }
  if (meld.type === 'pung') {
    return meldFact('triplet', [meld.tile, meld.tile, meld.tile], 'open', true, false);
  }
  return meldFact('kong', [meld.tile, meld.tile, meld.tile, meld.tile], meld.exposure, true, false);
}

function deriveStandardMelds(
  placed: PlacedWinningDecomposition,
  context: WinContext,
): readonly DerivedMeldFact[] {
  if (placed.decomposition.structureKey !== 'standard-meld-pair') {
    return Object.freeze([]);
  }

  const concealed = placed.decomposition.concealedMelds.map((meld, meldIndex) => {
    const placement = placed.winningTilePlacement;
    const completedByWinningTile =
      (placement.kind === 'sequence' || placement.kind === 'triplet') &&
      placement.meldIndex === meldIndex;
    const losesConcealedPungStatus =
      meld.kind === 'triplet' && completedByWinningTile && context.mode === 'discard';

    return meld.kind === 'sequence'
      ? meldFact('sequence', meld.tiles, 'concealed', false, completedByWinningTile)
      : meldFact(
          'triplet',
          [meld.tile, meld.tile, meld.tile],
          losesConcealedPungStatus ? 'open' : 'concealed',
          false,
          completedByWinningTile,
        );
  });

  return Object.freeze([...concealed, ...placed.decomposition.declaredMelds.map(declaredMeldFact)]);
}

function deriveWaitKind(placed: PlacedWinningDecomposition): WaitKind {
  const placement = placed.winningTilePlacement;
  if (
    placement.kind === 'pair' ||
    placement.kind === 'seven-pairs-pair' ||
    placement.kind === 'thirteen-orphans-pair'
  ) {
    return 'single';
  }
  if (placement.kind !== 'sequence') {
    return 'other';
  }

  const decomposition = placed.decomposition;
  if (decomposition.structureKey !== 'standard-meld-pair') {
    return 'other';
  }
  const meld = decomposition.concealedMelds[placement.meldIndex];
  if (meld?.kind !== 'sequence') {
    return 'other';
  }
  const first = getTileMetadata(meld.tiles[0]);
  if (first.kind !== 'suited') {
    return 'other';
  }
  if (placement.tileIndex === 1) {
    return 'closed';
  }
  if (
    (first.rank === 1 && placement.tileIndex === 2) ||
    (first.rank === 7 && placement.tileIndex === 0)
  ) {
    return 'edge';
  }
  return 'other';
}

function countTiles(tiles: readonly TileCode[]): Readonly<Partial<Record<TileCode, number>>> {
  const counts: Partial<Record<TileCode, number>> = {};
  tiles.forEach((tile) => {
    counts[tile] = (counts[tile] ?? 0) + 1;
  });
  return Object.freeze(counts);
}

export function deriveFacts(
  hand: HandSnapshot,
  context: WinContext,
  placed: PlacedWinningDecomposition,
): DerivedFacts {
  const allTiles = Object.freeze([
    ...hand.concealed,
    ...(hand.winningTile === null ? [] : [hand.winningTile]),
    ...hand.melds.flatMap(expandDeclaredMeld),
  ]);
  const metadata = allTiles.map(getTileMetadata);
  const melds = deriveStandardMelds(placed, context);
  const sequences = Object.freeze(melds.filter(({ kind }) => kind === 'sequence'));
  const pungLikeMelds = Object.freeze(melds.filter(({ kind }) => kind !== 'sequence'));
  const kongs = Object.freeze(melds.filter(({ kind }) => kind === 'kong'));
  const pairTile =
    placed.decomposition.structureKey === 'standard-meld-pair'
      ? placed.decomposition.pair.tile
      : placed.decomposition.structureKey === 'thirteen-orphans'
        ? placed.decomposition.pairTile
        : null;
  const pairTiles = Object.freeze(
    placed.decomposition.structureKey === 'seven-pairs'
      ? [...placed.decomposition.pairs]
      : pairTile === null
        ? []
        : [pairTile],
  );
  const suits = Object.freeze(
    [...new Set(metadata.flatMap((item) => (item.kind === 'suited' ? [item.suit] : [])))].sort(),
  );
  const honorTiles = Object.freeze(
    [...new Set(metadata.flatMap((item) => (item.kind === 'honor' ? [item.code] : [])))].sort(),
  );
  const openDeclaredMeldCount = melds.filter(
    ({ declared, exposure }) => declared && exposure === 'open',
  ).length;

  return Object.freeze({
    hand,
    context,
    placed,
    structureKey: placed.decomposition.structureKey,
    allTiles,
    tileCounts: countTiles(allTiles),
    suits,
    honorTiles,
    hasHonors: metadata.some(({ kind }) => kind === 'honor'),
    hasWinds: metadata.some((item) => item.kind === 'honor' && item.honorKind === 'wind'),
    hasDragons: metadata.some((item) => item.kind === 'honor' && item.honorKind === 'dragon'),
    melds,
    sequences,
    pungLikeMelds,
    kongs,
    concealedPungCount: pungLikeMelds.filter(({ exposure }) => exposure === 'concealed').length,
    pairTile,
    pairTiles,
    isConcealedHand: openDeclaredMeldCount === 0,
    openDeclaredMeldCount,
    waitKind: deriveWaitKind(placed),
    flowerCount: hand.flowers.length,
  });
}
