import type { HandSnapshot } from './hand';
import { countHandStructure, type HandCount } from './hand-count';
import type { Meld } from './meld';
import { getTileMetadata, TILE_CODES, type TileCode, type TileMetadata } from './tile';

export type TileCountByCode = Readonly<Partial<Record<TileCode, number>>>;

export type HandValidationPolicy = Readonly<{
  enabledTiles: readonly TileCode[];
  maxCopies: Readonly<Partial<Record<TileCode, number>>>;
}>;

export type HandTileLocation =
  | Readonly<{ area: 'concealed'; index: number }>
  | Readonly<{ area: 'winning-tile' }>
  | Readonly<{ area: 'flowers'; index: number }>
  | Readonly<{
      area: 'meld';
      meldIndex: number;
      meldId: string;
      tileIndex: number;
    }>;

export type HandValidationIssue =
  | Readonly<{
      reasonCode: 'TILE_NOT_ENABLED';
      data: Readonly<{ tile: TileCode; location: HandTileLocation }>;
    }>
  | Readonly<{
      reasonCode: 'TILE_COPY_LIMIT_EXCEEDED';
      data: Readonly<{ tile: TileCode; actual: number; maximum: number }>;
    }>
  | Readonly<{
      reasonCode: 'FLOWER_IN_STRUCTURAL_AREA';
      data: Readonly<{ tile: TileCode; location: HandTileLocation }>;
    }>
  | Readonly<{
      reasonCode: 'NON_FLOWER_IN_FLOWER_AREA';
      data: Readonly<{ tile: TileCode; location: HandTileLocation }>;
    }>
  | Readonly<{
      reasonCode: 'INVALID_CHOW';
      data: Readonly<{
        meldId: string;
        tiles: readonly TileCode[];
        cause: 'TILE_COUNT' | 'NON_SUITED_TILE' | 'MIXED_SUIT' | 'NOT_CONSECUTIVE';
      }>;
    }>
  | Readonly<{
      reasonCode: 'EMPTY_MELD_ID';
      data: Readonly<{ meldIndex: number }>;
    }>
  | Readonly<{
      reasonCode: 'DUPLICATE_MELD_ID';
      data: Readonly<{ meldId: string; meldIndex: number }>;
    }>;

export type HandValidationResult = Readonly<{
  isValid: boolean;
  counts: HandCount;
  tileCounts: TileCountByCode;
  issues: readonly HandValidationIssue[];
}>;

function addTileCount(counts: Partial<Record<TileCode, number>>, tile: TileCode): void {
  counts[tile] = (counts[tile] ?? 0) + 1;
}

function getMeldTiles(meld: Meld): readonly TileCode[] {
  switch (meld.type) {
    case 'chow':
      return meld.tiles;
    case 'pung':
      return [meld.tile, meld.tile, meld.tile];
    case 'kong':
      return [meld.tile, meld.tile, meld.tile, meld.tile];
  }
}

export function countHandTilesByCode(hand: HandSnapshot): TileCountByCode {
  const counts: Partial<Record<TileCode, number>> = {};

  for (const tile of hand.concealed) {
    addTileCount(counts, tile);
  }

  for (const meld of hand.melds) {
    for (const tile of getMeldTiles(meld)) {
      addTileCount(counts, tile);
    }
  }

  for (const tile of hand.flowers) {
    addTileCount(counts, tile);
  }

  if (hand.winningTile !== null) {
    addTileCount(counts, hand.winningTile);
  }

  return Object.freeze(counts);
}

export function getTileCount(counts: TileCountByCode, tile: TileCode): number {
  return counts[tile] ?? 0;
}

function getChowCause(
  tiles: readonly TileCode[],
): Extract<HandValidationIssue, { reasonCode: 'INVALID_CHOW' }>['data']['cause'] | null {
  if (tiles.length !== 3) {
    return 'TILE_COUNT';
  }

  const metadata: readonly TileMetadata[] = tiles.map(getTileMetadata);

  if (metadata.some((tile) => tile.kind !== 'suited')) {
    return 'NON_SUITED_TILE';
  }

  const suitedTiles = metadata.filter((tile) => tile.kind === 'suited');
  const firstTile = suitedTiles[0];

  if (firstTile === undefined || suitedTiles.some((tile) => tile.suit !== firstTile.suit)) {
    return 'MIXED_SUIT';
  }

  const ranks = suitedTiles.map((tile) => tile.rank).sort((left, right) => left - right);

  return ranks[1] === ranks[0]! + 1 && ranks[2] === ranks[1] + 1 ? null : 'NOT_CONSECUTIVE';
}

function visitHandTiles(
  hand: HandSnapshot,
  visitor: (tile: TileCode, location: HandTileLocation) => void,
): void {
  hand.concealed.forEach((tile, index) => visitor(tile, { area: 'concealed', index }));

  hand.melds.forEach((meld, meldIndex) => {
    getMeldTiles(meld).forEach((tile, tileIndex) =>
      visitor(tile, { area: 'meld', meldIndex, meldId: meld.id, tileIndex }),
    );
  });

  hand.flowers.forEach((tile, index) => visitor(tile, { area: 'flowers', index }));

  if (hand.winningTile !== null) {
    visitor(hand.winningTile, { area: 'winning-tile' });
  }
}

export function validateHandSnapshot(
  hand: HandSnapshot,
  policy: HandValidationPolicy,
): HandValidationResult {
  const issues: HandValidationIssue[] = [];
  const enabledTiles = new Set(policy.enabledTiles);
  const seenMeldIds = new Set<string>();

  visitHandTiles(hand, (tile, location) => {
    const metadata = getTileMetadata(tile);

    if (!enabledTiles.has(tile)) {
      issues.push({ reasonCode: 'TILE_NOT_ENABLED', data: { tile, location } });
    }

    if (metadata.kind === 'flower' && location.area !== 'flowers') {
      issues.push({ reasonCode: 'FLOWER_IN_STRUCTURAL_AREA', data: { tile, location } });
    }

    if (metadata.kind !== 'flower' && location.area === 'flowers') {
      issues.push({ reasonCode: 'NON_FLOWER_IN_FLOWER_AREA', data: { tile, location } });
    }
  });

  hand.melds.forEach((meld, meldIndex) => {
    if (meld.id.length === 0) {
      issues.push({ reasonCode: 'EMPTY_MELD_ID', data: { meldIndex } });
    } else if (seenMeldIds.has(meld.id)) {
      issues.push({ reasonCode: 'DUPLICATE_MELD_ID', data: { meldId: meld.id, meldIndex } });
    } else {
      seenMeldIds.add(meld.id);
    }

    if (meld.type === 'chow') {
      const cause = getChowCause(meld.tiles);

      if (cause !== null) {
        issues.push({
          reasonCode: 'INVALID_CHOW',
          data: { meldId: meld.id, tiles: Object.freeze([...meld.tiles]), cause },
        });
      }
    }
  });

  const tileCounts = countHandTilesByCode(hand);

  for (const tile of TILE_CODES) {
    const maximum = policy.maxCopies[tile];

    if (maximum === undefined) {
      continue;
    }

    const actual = getTileCount(tileCounts, tile);

    if (actual > maximum) {
      issues.push({
        reasonCode: 'TILE_COPY_LIMIT_EXCEEDED',
        data: { tile, actual, maximum },
      });
    }
  }

  const frozenIssues = Object.freeze(issues);

  return Object.freeze({
    isValid: frozenIssues.length === 0,
    counts: countHandStructure(hand),
    tileCounts,
    issues: frozenIssues,
  });
}
