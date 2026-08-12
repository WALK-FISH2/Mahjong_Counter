import type { HandSnapshot } from '../../mahjong/hand';
import { getTileMetadata, type TileCode } from '../../mahjong/tile';
import type {
  SevenPairsStructureDefinition,
  ThirteenOrphansStructureDefinition,
} from '../../rules/structure-definition';
import { createTileCount, getTileCountForCode, tileIndexToCode } from './tile-count';

export type SevenPairsDecomposition = Readonly<{
  structureKey: 'seven-pairs';
  pairs: readonly TileCode[];
}>;

export type ThirteenOrphansDecomposition = Readonly<{
  structureKey: 'thirteen-orphans';
  requiredTiles: readonly TileCode[];
  pairTile: TileCode;
}>;

function structuralTiles(hand: HandSnapshot): readonly TileCode[] {
  return Object.freeze([
    ...hand.concealed,
    ...(hand.winningTile === null ? [] : [hand.winningTile]),
  ]);
}

function hasFlowerInStructuralArea(hand: HandSnapshot): boolean {
  return structuralTiles(hand).some((tile) => getTileMetadata(tile).kind === 'flower');
}

export function enumerateSevenPairsDecompositions(
  hand: HandSnapshot,
  definition: SevenPairsStructureDefinition,
): readonly SevenPairsDecomposition[] {
  if (!definition.enabled || hand.melds.length > 0 || hasFlowerInStructuralArea(hand)) {
    return Object.freeze([]);
  }

  const tileCount = createTileCount(structuralTiles(hand));
  const expectedTileCount = definition.parameters.requiredPairCount * 2;

  if (tileCount.total !== expectedTileCount) {
    return Object.freeze([]);
  }

  const pairs: TileCode[] = [];

  tileCount.counts.forEach((count, index) => {
    if (count === 0) {
      return;
    }

    const pairUnits = count / 2;
    const isAllowedQuad = count === 4 && definition.parameters.quadHandling === 'TWO_PAIRS';

    if ((count !== 2 && !isAllowedQuad) || !Number.isInteger(pairUnits)) {
      return;
    }

    const tile = tileIndexToCode(index);
    for (let pairIndex = 0; pairIndex < pairUnits; pairIndex += 1) {
      pairs.push(tile);
    }
  });

  if (pairs.length !== definition.parameters.requiredPairCount) {
    return Object.freeze([]);
  }

  return Object.freeze([
    Object.freeze({
      structureKey: 'seven-pairs' as const,
      pairs: Object.freeze(pairs),
    }),
  ]);
}

export function enumerateThirteenOrphansDecompositions(
  hand: HandSnapshot,
  definition: ThirteenOrphansStructureDefinition,
): readonly ThirteenOrphansDecomposition[] {
  if (!definition.enabled || hand.melds.length > 0 || hasFlowerInStructuralArea(hand)) {
    return Object.freeze([]);
  }

  const tileCount = createTileCount(structuralTiles(hand));
  const requiredTiles = definition.parameters.requiredTiles;
  const expectedTileCount = requiredTiles.length - 1 + definition.parameters.duplicateTileCount;

  if (tileCount.total !== expectedTileCount) {
    return Object.freeze([]);
  }

  const requiredTileSet = new Set(requiredTiles);
  let pairTile: TileCode | null = null;

  for (const tile of requiredTiles) {
    const count = getTileCountForCode(tileCount, tile);

    if (count === definition.parameters.duplicateTileCount && pairTile === null) {
      pairTile = tile;
      continue;
    }

    if (count !== 1) {
      return Object.freeze([]);
    }
  }

  const containsUnexpectedTile = tileCount.counts.some(
    (count, index) => count > 0 && !requiredTileSet.has(tileIndexToCode(index)),
  );

  if (containsUnexpectedTile || pairTile === null) {
    return Object.freeze([]);
  }

  return Object.freeze([
    Object.freeze({
      structureKey: 'thirteen-orphans' as const,
      requiredTiles: Object.freeze([...requiredTiles]),
      pairTile,
    }),
  ]);
}
