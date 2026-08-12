import { createAppStore, type AppStore } from '../state/create-app-store';
import {
  compareTileCodes,
  countHandTilesByCode,
  createCalculatorDocument,
  createHandSnapshot,
  createWinContext,
  getTileCount,
  getTileMetadata,
  reviseCalculatorDocument,
  type CalculatorDocument,
  type TileCode,
} from '../../domain/mahjong';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';

export type ConcealedSortMode = 'input-order' | 'tile-order';

export type CalculatorInputRejection =
  'TILE_NOT_ENABLED' | 'TILE_NOT_CONCEALED' | 'TILE_COPY_LIMIT_REACHED';

export type CalculatorInputResult =
  | Readonly<{ accepted: true }>
  | Readonly<{ accepted: false; reasonCode: CalculatorInputRejection }>;

export type DisplayedConcealedTile = Readonly<{
  tile: TileCode;
  originalIndex: number;
}>;

export type CalculatorState = Readonly<{
  document: CalculatorDocument;
  rulePackage: RulePackageDefinition;
  concealedSortMode: ConcealedSortMode;
  addConcealedTile: (tile: TileCode) => CalculatorInputResult;
  removeConcealedTile: (originalIndex: number) => boolean;
  arrangeConcealedTiles: () => void;
}>;

export type CalculatorStore = AppStore<CalculatorState>;

const ACCEPTED_INPUT: CalculatorInputResult = Object.freeze({ accepted: true });

function rejectedInput(reasonCode: CalculatorInputRejection): CalculatorInputResult {
  return Object.freeze({ accepted: false, reasonCode });
}

export function createInitialCalculatorDocument(
  rulePackage: RulePackageDefinition,
): CalculatorDocument {
  return createCalculatorDocument({
    schemaVersion: 1,
    ruleRef: {
      ruleId: rulePackage.manifest.ruleId,
      ruleVersion: rulePackage.manifest.ruleVersion,
    },
    hand: createHandSnapshot(),
    context: createWinContext('discard'),
  });
}

export function getDisplayedConcealedTiles(
  document: CalculatorDocument,
  sortMode: ConcealedSortMode,
): readonly DisplayedConcealedTile[] {
  const tiles = document.hand.concealed.map((tile, originalIndex) => ({ tile, originalIndex }));

  if (sortMode === 'tile-order') {
    tiles.sort(
      (left, right) =>
        compareTileCodes(left.tile, right.tile) || left.originalIndex - right.originalIndex,
    );
  }

  return Object.freeze(tiles.map((tile) => Object.freeze(tile)));
}

export function createCalculatorStore(
  rulePackage: RulePackageDefinition,
  initialDocument: CalculatorDocument = createInitialCalculatorDocument(rulePackage),
): CalculatorStore {
  if (
    initialDocument.ruleRef.ruleId !== rulePackage.manifest.ruleId ||
    initialDocument.ruleRef.ruleVersion !== rulePackage.manifest.ruleVersion
  ) {
    throw new Error('CalculatorDocument RuleRef must match the supplied RulePackage.');
  }

  return createAppStore<CalculatorState>((set, get) => ({
    document: initialDocument,
    rulePackage,
    concealedSortMode: 'input-order',
    addConcealedTile: (tile) => {
      const current = get();
      const tileSet = current.rulePackage.tileSet;

      if (!tileSet.enabledTiles.includes(tile)) {
        return rejectedInput('TILE_NOT_ENABLED');
      }

      if (getTileMetadata(tile).kind === 'flower') {
        return rejectedInput('TILE_NOT_CONCEALED');
      }

      const maximum = tileSet.maxCopies[tile];
      const used = getTileCount(countHandTilesByCode(current.document.hand), tile);

      if (maximum !== undefined && used >= maximum) {
        return rejectedInput('TILE_COPY_LIMIT_REACHED');
      }

      const hand = createHandSnapshot({
        ...current.document.hand,
        concealed: [...current.document.hand.concealed, tile],
      });

      set({ document: reviseCalculatorDocument(current.document, { hand }) });
      return ACCEPTED_INPUT;
    },
    removeConcealedTile: (originalIndex) => {
      const current = get();

      if (
        !Number.isSafeInteger(originalIndex) ||
        originalIndex < 0 ||
        originalIndex >= current.document.hand.concealed.length
      ) {
        return false;
      }

      const concealed = current.document.hand.concealed.filter(
        (_, index) => index !== originalIndex,
      );
      const hand = createHandSnapshot({ ...current.document.hand, concealed });

      set({ document: reviseCalculatorDocument(current.document, { hand }) });
      return true;
    },
    arrangeConcealedTiles: () => set({ concealedSortMode: 'tile-order' }),
  }));
}
