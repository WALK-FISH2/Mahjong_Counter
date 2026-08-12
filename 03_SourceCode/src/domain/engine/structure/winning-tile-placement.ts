import type { HandSnapshot } from '../../mahjong/hand';
import type { TileCode } from '../../mahjong/tile';
import type {
  SevenPairsDecomposition,
  ThirteenOrphansDecomposition,
} from './special-decomposition';
import type { StandardDecomposition } from './standard-decomposition';
import { getWinningDecompositionKey, type WinningDecomposition } from './structure-engine';

export type StandardWinningTilePlacement =
  | Readonly<{ kind: 'pair'; tile: TileCode }>
  | Readonly<{ kind: 'sequence'; meldIndex: number; tileIndex: 0 | 1 | 2 }>
  | Readonly<{ kind: 'triplet'; meldIndex: number }>;

export type SevenPairsWinningTilePlacement = Readonly<{
  kind: 'seven-pairs-pair';
  pairIndex: number;
}>;

export type ThirteenOrphansWinningTilePlacement = Readonly<{
  kind: 'thirteen-orphans-pair' | 'thirteen-orphans-single';
  tile: TileCode;
}>;

export type WinningTilePlacement =
  | StandardWinningTilePlacement
  | SevenPairsWinningTilePlacement
  | ThirteenOrphansWinningTilePlacement;

export type PlacedWinningDecomposition = Readonly<{
  decomposition: WinningDecomposition;
  winningTilePlacement: WinningTilePlacement;
}>;

function standardPlacements(
  decomposition: StandardDecomposition,
  winningTile: TileCode,
): readonly StandardWinningTilePlacement[] {
  const placements: StandardWinningTilePlacement[] = [];

  if (decomposition.pair.tile === winningTile) {
    placements.push(Object.freeze({ kind: 'pair', tile: winningTile }));
  }

  decomposition.concealedMelds.forEach((meld, meldIndex) => {
    if (meld.kind === 'triplet' && meld.tile === winningTile) {
      placements.push(Object.freeze({ kind: 'triplet', meldIndex }));
      return;
    }

    if (meld.kind === 'sequence') {
      meld.tiles.forEach((tile, tileIndex) => {
        if (tile === winningTile) {
          placements.push(
            Object.freeze({ kind: 'sequence', meldIndex, tileIndex: tileIndex as 0 | 1 | 2 }),
          );
        }
      });
    }
  });

  return Object.freeze(placements);
}

function sevenPairsPlacements(
  decomposition: SevenPairsDecomposition,
  winningTile: TileCode,
): readonly SevenPairsWinningTilePlacement[] {
  const placements = decomposition.pairs.flatMap((tile, pairIndex) =>
    tile === winningTile ? [Object.freeze({ kind: 'seven-pairs-pair' as const, pairIndex })] : [],
  );

  return Object.freeze(placements);
}

function thirteenOrphansPlacements(
  decomposition: ThirteenOrphansDecomposition,
  winningTile: TileCode,
): readonly ThirteenOrphansWinningTilePlacement[] {
  if (!decomposition.requiredTiles.includes(winningTile)) {
    return Object.freeze([]);
  }

  return Object.freeze([
    Object.freeze({
      kind:
        decomposition.pairTile === winningTile
          ? ('thirteen-orphans-pair' as const)
          : ('thirteen-orphans-single' as const),
      tile: winningTile,
    }),
  ]);
}

function placementKey(
  decomposition: WinningDecomposition,
  placement: WinningTilePlacement,
): string {
  switch (placement.kind) {
    case 'pair':
      return `pair:${placement.tile}`;
    case 'sequence':
      if (decomposition.structureKey !== 'standard-meld-pair') {
        return 'invalid:sequence';
      }
      {
        const meld = decomposition.concealedMelds[placement.meldIndex];
        return `sequence:${meld?.kind === 'sequence' ? meld.tiles.join('-') : 'invalid'}:${placement.tileIndex}`;
      }
    case 'triplet':
      if (decomposition.structureKey !== 'standard-meld-pair') {
        return 'invalid:triplet';
      }
      {
        const meld = decomposition.concealedMelds[placement.meldIndex];
        return `triplet:${meld?.kind === 'triplet' ? meld.tile : 'invalid'}`;
      }
    case 'seven-pairs-pair':
      if (decomposition.structureKey !== 'seven-pairs') {
        return 'invalid:seven-pairs-pair';
      }
      return `seven-pairs-pair:${decomposition.pairs[placement.pairIndex] ?? 'invalid'}`;
    case 'thirteen-orphans-pair':
    case 'thirteen-orphans-single':
      return `${placement.kind}:${placement.tile}`;
  }
}

function enumeratePlacements(
  decomposition: WinningDecomposition,
  winningTile: TileCode,
): readonly WinningTilePlacement[] {
  switch (decomposition.structureKey) {
    case 'standard-meld-pair':
      return standardPlacements(decomposition, winningTile);
    case 'seven-pairs':
      return sevenPairsPlacements(decomposition, winningTile);
    case 'thirteen-orphans':
      return thirteenOrphansPlacements(decomposition, winningTile);
  }
}

export function placeWinningTile(
  hand: HandSnapshot,
  decompositions: readonly WinningDecomposition[],
): readonly PlacedWinningDecomposition[] {
  if (hand.winningTile === null) {
    return Object.freeze([]);
  }

  const winningTile = hand.winningTile;
  const placed: PlacedWinningDecomposition[] = [];
  const seen = new Set<string>();

  decompositions.forEach((decomposition) => {
    for (const placement of enumeratePlacements(decomposition, winningTile)) {
      const key = `${getWinningDecompositionKey(decomposition)}:${placementKey(decomposition, placement)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      placed.push(Object.freeze({ decomposition, winningTilePlacement: placement }));
    }
  });

  return Object.freeze(placed);
}
