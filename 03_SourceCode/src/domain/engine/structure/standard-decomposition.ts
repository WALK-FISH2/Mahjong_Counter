import type { HandSnapshot } from '../../mahjong/hand';
import { countHandStructure } from '../../mahjong/hand-count';
import type { Meld } from '../../mahjong/meld';
import { getTileMetadata, type TileCode, type TileSuit } from '../../mahjong/tile';
import type { HandModelDefinition, RuleMeldType } from '../../rules/hand-model';
import { createTileCount, TILE_COUNT_SIZE, tileIndexToCode, type TileCount } from './tile-count';

const STANDARD_MELD_STRUCTURAL_SIZE = 3;
const STANDARD_PAIR_SIZE = 2;

export type DecomposedSequence = Readonly<{
  kind: 'sequence';
  tiles: readonly [TileCode, TileCode, TileCode];
}>;

export type DecomposedTriplet = Readonly<{
  kind: 'triplet';
  tile: TileCode;
}>;

export type ConcealedDecomposedMeld = DecomposedSequence | DecomposedTriplet;

export type DecomposedPair = Readonly<{
  kind: 'pair';
  tile: TileCode;
}>;

export type StandardDecomposition = Readonly<{
  structureKey: 'standard-meld-pair';
  concealedMelds: readonly ConcealedDecomposedMeld[];
  pair: DecomposedPair;
  declaredMelds: readonly Meld[];
}>;

export type StandardDecompositionInput = Readonly<{
  hand: HandSnapshot;
  handModel: HandModelDefinition;
}>;

export type StandardSearchOptions = Readonly<{
  memoization?: boolean;
}>;

export type StandardSearchDiagnostics = Readonly<{
  visitedStates: number;
  expandedStates: number;
  memoHits: number;
  memoEntries: number;
  rawCandidateCount: number;
  duplicateCandidatesRemoved: number;
}>;

export type StandardSearchResult = Readonly<{
  decompositions: readonly StandardDecomposition[];
  diagnostics: StandardSearchDiagnostics;
}>;

type PartialDecomposition = Readonly<{
  concealedMelds: readonly ConcealedDecomposedMeld[];
  pair: TileCode | null;
}>;

type MutableSearchDiagnostics = {
  visitedStates: number;
  expandedStates: number;
  memoHits: number;
};

const SUITED_TILE_INDEX = new Map<string, number>();

for (let index = 0; index < TILE_COUNT_SIZE; index += 1) {
  const tile = tileIndexToCode(index);
  const metadata = getTileMetadata(tile);

  if (metadata.kind === 'suited') {
    SUITED_TILE_INDEX.set(`${metadata.suit}:${metadata.rank}`, index);
  }
}

function getSuitedIndex(suit: TileSuit, rank: number): number | undefined {
  return SUITED_TILE_INDEX.get(`${suit}:${rank}`);
}

function getSequenceIndexes(startIndex: number): readonly [number, number, number] | null {
  const startTile = tileIndexToCode(startIndex);
  const metadata = getTileMetadata(startTile);

  if (metadata.kind !== 'suited' || metadata.rank > 7) {
    return null;
  }

  const middleIndex = getSuitedIndex(metadata.suit, metadata.rank + 1);
  const endIndex = getSuitedIndex(metadata.suit, metadata.rank + 2);

  if (middleIndex === undefined || endIndex === undefined) {
    return null;
  }

  return [startIndex, middleIndex, endIndex];
}

function findFirstOccupiedIndex(counts: readonly number[]): number {
  return counts.findIndex((count) => count > 0);
}

function countRemainingTiles(counts: readonly number[]): number {
  return counts.reduce((total, count) => total + count, 0);
}

function createStateKey(
  counts: readonly number[],
  remainingMeldCount: number,
  pairRequired: boolean,
): string {
  return `${remainingMeldCount}:${pairRequired ? 1 : 0}:${counts.join(',')}`;
}

function freezePartial(
  concealedMelds: readonly ConcealedDecomposedMeld[],
  pair: TileCode | null,
): PartialDecomposition {
  return Object.freeze({ concealedMelds: Object.freeze([...concealedMelds]), pair });
}

function prependMeld(
  meld: ConcealedDecomposedMeld,
  suffixes: readonly PartialDecomposition[],
): readonly PartialDecomposition[] {
  return Object.freeze(
    suffixes.map((suffix) => freezePartial([meld, ...suffix.concealedMelds], suffix.pair)),
  );
}

function searchStandardStructure(
  counts: number[],
  remainingMeldCount: number,
  pairRequired: boolean,
  memo: Map<string, readonly PartialDecomposition[]> | null,
  diagnostics: MutableSearchDiagnostics,
): readonly PartialDecomposition[] {
  diagnostics.visitedStates += 1;

  const expectedRemainingTileCount =
    remainingMeldCount * STANDARD_MELD_STRUCTURAL_SIZE + (pairRequired ? STANDARD_PAIR_SIZE : 0);

  if (countRemainingTiles(counts) !== expectedRemainingTileCount) {
    return Object.freeze([]);
  }

  const stateKey = createStateKey(counts, remainingMeldCount, pairRequired);
  const memoized = memo?.get(stateKey);

  if (memoized !== undefined) {
    diagnostics.memoHits += 1;
    return memoized;
  }

  diagnostics.expandedStates += 1;

  const firstIndex = findFirstOccupiedIndex(counts);

  if (firstIndex === -1) {
    const completed =
      remainingMeldCount === 0 && !pairRequired
        ? Object.freeze([freezePartial([], null)])
        : Object.freeze([]);
    memo?.set(stateKey, completed);
    return completed;
  }

  const results: PartialDecomposition[] = [];
  const firstTile = tileIndexToCode(firstIndex);

  if (remainingMeldCount > 0 && counts[firstIndex]! >= 3) {
    counts[firstIndex] = counts[firstIndex]! - 3;
    const suffixes = searchStandardStructure(
      counts,
      remainingMeldCount - 1,
      pairRequired,
      memo,
      diagnostics,
    );
    counts[firstIndex] = counts[firstIndex] + 3;
    results.push(...prependMeld(Object.freeze({ kind: 'triplet', tile: firstTile }), suffixes));
  }

  if (remainingMeldCount > 0) {
    const sequenceIndexes = getSequenceIndexes(firstIndex);

    if (sequenceIndexes !== null && sequenceIndexes.every((index) => counts[index]! > 0)) {
      for (const index of sequenceIndexes) {
        counts[index] = counts[index]! - 1;
      }

      const suffixes = searchStandardStructure(
        counts,
        remainingMeldCount - 1,
        pairRequired,
        memo,
        diagnostics,
      );

      for (const index of sequenceIndexes) {
        counts[index] = counts[index]! + 1;
      }

      results.push(
        ...prependMeld(
          Object.freeze({
            kind: 'sequence',
            tiles: Object.freeze(sequenceIndexes.map(tileIndexToCode)) as readonly [
              TileCode,
              TileCode,
              TileCode,
            ],
          }),
          suffixes,
        ),
      );
    }
  }

  if (pairRequired && counts[firstIndex]! >= 2) {
    counts[firstIndex] = counts[firstIndex]! - 2;
    const suffixes = searchStandardStructure(counts, remainingMeldCount, false, memo, diagnostics);
    counts[firstIndex] = counts[firstIndex] + 2;

    results.push(...suffixes.map((suffix) => freezePartial(suffix.concealedMelds, firstTile)));
  }

  const frozenResults = Object.freeze(results);
  memo?.set(stateKey, frozenResults);
  return frozenResults;
}

function meldTypeForRule(meld: Meld): RuleMeldType {
  if (meld.type === 'kong') {
    return meld.exposure === 'open' ? 'open-kong' : 'concealed-kong';
  }

  return meld.type;
}

function isSearchableInput(input: StandardDecompositionInput, concealedTiles: TileCount): boolean {
  const { hand, handModel } = input;
  const declaredMeldCount = hand.melds.length;

  if (
    !Number.isSafeInteger(handModel.requiredMeldCount) ||
    handModel.requiredMeldCount < 0 ||
    !Number.isSafeInteger(handModel.targetStructuralTileCount) ||
    handModel.targetStructuralTileCount <= 0 ||
    !Number.isSafeInteger(handModel.maxDeclaredMelds) ||
    handModel.maxDeclaredMelds < 0 ||
    declaredMeldCount > handModel.requiredMeldCount ||
    declaredMeldCount > handModel.maxDeclaredMelds
  ) {
    return false;
  }

  if (hand.melds.some((meld) => !handModel.allowedMeldTypes.includes(meldTypeForRule(meld)))) {
    return false;
  }

  if (
    hand.concealed.some((tile) => getTileMetadata(tile).kind === 'flower') ||
    (hand.winningTile !== null && getTileMetadata(hand.winningTile).kind === 'flower')
  ) {
    return false;
  }

  const expectedTarget =
    handModel.requiredMeldCount * STANDARD_MELD_STRUCTURAL_SIZE + STANDARD_PAIR_SIZE;
  const remainingMeldCount = handModel.requiredMeldCount - declaredMeldCount;
  const expectedConcealedTileCount =
    remainingMeldCount * STANDARD_MELD_STRUCTURAL_SIZE + STANDARD_PAIR_SIZE;

  return (
    handModel.targetStructuralTileCount === expectedTarget &&
    countHandStructure(hand).structuralTileCount === handModel.targetStructuralTileCount &&
    concealedTiles.total === expectedConcealedTileCount
  );
}

function concealedMeldKey(meld: ConcealedDecomposedMeld): string {
  return meld.kind === 'triplet' ? `triplet:${meld.tile}` : `sequence:${meld.tiles.join('-')}`;
}

function declaredMeldKey(meld: Meld): string {
  if (meld.type === 'chow') {
    return `chow:${[...meld.tiles]
      .sort((left, right) => tileCodeToStableOrder(left) - tileCodeToStableOrder(right))
      .join('-')}`;
  }

  if (meld.type === 'pung') {
    return `pung:${meld.tile}`;
  }

  return `kong:${meld.exposure}:${meld.openKind ?? 'none'}:${meld.tile}`;
}

function tileCodeToStableOrder(tile: TileCode): number {
  return getTileMetadata(tile).sortIndex;
}

function compareCanonicalKeys(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

export function canonicalizeStandardDecomposition(
  decomposition: StandardDecomposition,
): StandardDecomposition {
  const concealedMelds = [...decomposition.concealedMelds].sort((left, right) =>
    compareCanonicalKeys(concealedMeldKey(left), concealedMeldKey(right)),
  );

  return Object.freeze({
    structureKey: 'standard-meld-pair',
    concealedMelds: Object.freeze(concealedMelds),
    pair: Object.freeze({ kind: 'pair', tile: decomposition.pair.tile }),
    declaredMelds: Object.freeze([...decomposition.declaredMelds]),
  });
}

export function getStandardDecompositionKey(decomposition: StandardDecomposition): string {
  const canonical = canonicalizeStandardDecomposition(decomposition);
  const declaredKey = canonical.declaredMelds
    .map(declaredMeldKey)
    .sort(compareCanonicalKeys)
    .join('|');

  return `${canonical.pair.tile}|${canonical.concealedMelds.map(concealedMeldKey).join('|')}|declared:${declaredKey}`;
}

export function deduplicateStandardDecompositions(
  decompositions: readonly StandardDecomposition[],
): readonly StandardDecomposition[] {
  const unique = new Map<string, StandardDecomposition>();

  for (const decomposition of decompositions) {
    const canonical = canonicalizeStandardDecomposition(decomposition);
    const key = getStandardDecompositionKey(canonical);

    if (!unique.has(key)) {
      unique.set(key, canonical);
    }
  }

  return Object.freeze(
    [...unique.entries()]
      .sort(([left], [right]) => compareCanonicalKeys(left, right))
      .map(([, value]) => value),
  );
}

function emptySearchResult(): StandardSearchResult {
  return Object.freeze({
    decompositions: Object.freeze([]),
    diagnostics: Object.freeze({
      visitedStates: 0,
      expandedStates: 0,
      memoHits: 0,
      memoEntries: 0,
      rawCandidateCount: 0,
      duplicateCandidatesRemoved: 0,
    }),
  });
}

export function inspectStandardDecompositionSearch(
  input: StandardDecompositionInput,
  options: StandardSearchOptions = {},
): StandardSearchResult {
  const concealedTiles = createTileCount([
    ...input.hand.concealed,
    ...(input.hand.winningTile === null ? [] : [input.hand.winningTile]),
  ]);

  if (!isSearchableInput(input, concealedTiles)) {
    return emptySearchResult();
  }

  const memoization = options.memoization ?? true;
  const memo = memoization ? new Map<string, readonly PartialDecomposition[]>() : null;
  const mutableDiagnostics: MutableSearchDiagnostics = {
    visitedStates: 0,
    expandedStates: 0,
    memoHits: 0,
  };
  const remainingMeldCount = input.handModel.requiredMeldCount - input.hand.melds.length;
  const partials = searchStandardStructure(
    [...concealedTiles.counts],
    remainingMeldCount,
    true,
    memo,
    mutableDiagnostics,
  );
  const rawDecompositions = partials.flatMap((partial): readonly StandardDecomposition[] => {
    if (partial.pair === null) {
      return [];
    }

    return [
      Object.freeze({
        structureKey: 'standard-meld-pair' as const,
        concealedMelds: partial.concealedMelds,
        pair: Object.freeze({ kind: 'pair' as const, tile: partial.pair }),
        declaredMelds: Object.freeze([...input.hand.melds]),
      }),
    ];
  });
  const decompositions = deduplicateStandardDecompositions(rawDecompositions);

  return Object.freeze({
    decompositions,
    diagnostics: Object.freeze({
      ...mutableDiagnostics,
      memoEntries: memo?.size ?? 0,
      rawCandidateCount: rawDecompositions.length,
      duplicateCandidatesRemoved: rawDecompositions.length - decompositions.length,
    }),
  });
}

export function enumerateStandardDecompositions(
  input: StandardDecompositionInput,
): readonly StandardDecomposition[] {
  return inspectStandardDecompositionSearch(input).decompositions;
}
