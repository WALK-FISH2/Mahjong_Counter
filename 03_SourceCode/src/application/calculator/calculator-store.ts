import { createAppStore, type AppStore } from '../state/create-app-store';
import {
  NO_TRANSIENT_INPUT,
  addTransientChowTile,
  cancelTransientInput,
  compareTileCodes,
  countHandTilesByCode,
  createCalculatorDocument,
  createChowMeld,
  createConcealedKongMeld,
  createHandSnapshot,
  createOpenKongMeld,
  createPungMeld,
  createWinContext,
  countHandStructure,
  getTileCount,
  getTileMetadata,
  isKnownContextValue,
  knownContextValue,
  removeTransientChowTile,
  reviseCalculatorDocument,
  startChowInput,
  startConcealedKongInput,
  startFlowerInput,
  startOpenKongInput,
  startPungInput,
  setContextValue,
  validateHandSnapshot,
  type CalculatorDocument,
  type HandSnapshot,
  type HandTileLocation,
  type HandValidationIssue,
  type Meld,
  type OpenKongKind,
  type TileCode,
  type TileCountByCode,
  type TransientInputSession,
  type KnownContextPrimitive,
  type WinContext,
  type WinMode,
} from '../../domain/mahjong';
import {
  getMissingRequiredContextIds,
  isContextDefinitionApplicable,
} from '../../domain/engine/legality';
import { enumerateWinningDecompositions } from '../../domain/engine/structure';
import type { SystemEvaluation } from '../../domain/engine/evaluation';
import type { ContextDefinition } from '../../domain/rules/context-definition';
import type { RuleMeldType } from '../../domain/rules/hand-model';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';

export type ConcealedSortMode = 'input-order' | 'tile-order';
export type CalculatorTransientInputKind = Exclude<TransientInputSession['kind'], 'none'>;

export type CalculatorInputRejection =
  | 'TILE_NOT_ENABLED'
  | 'TILE_NOT_CONCEALED'
  | 'TILE_NOT_FLOWER'
  | 'TILE_COPY_LIMIT_REACHED'
  | 'INVALID_CHOW'
  | 'MELD_LIMIT_REACHED'
  | 'MELD_TYPE_NOT_ALLOWED'
  | 'OPEN_KONG_KIND_NOT_ALLOWED'
  | 'FLOWERS_NOT_SUPPORTED'
  | 'TRANSIENT_INPUT_NOT_ACTIVE'
  | 'MELD_NOT_FOUND'
  | 'ADDED_KONG_TILE_MISMATCH'
  | 'CONTEXT_FIELD_NOT_AVAILABLE'
  | 'CONTEXT_VALUE_INVALID'
  | 'ANALYSIS_NOT_READY'
  | 'ANALYSIS_UNAVAILABLE'
  | 'ANALYSIS_FAILED';

export type CalculatorInputResult =
  | Readonly<{ accepted: true }>
  | Readonly<{ accepted: false; reasonCode: CalculatorInputRejection }>;

export type TransientTileInputResult =
  | Readonly<{ accepted: true; completed: boolean }>
  | Readonly<{ accepted: false; reasonCode: CalculatorInputRejection }>;

export type DisplayedConcealedTile = Readonly<{
  tile: TileCode;
  originalIndex: number;
}>;

export type WinningTileConfirmation = Readonly<{
  recommendedOriginalIndex: number;
}>;

export type CalculatorAnalysisPhase = 'insufficient' | 'ready' | 'analyzing' | 'result';

export type ContextRemoval = Readonly<{
  contextId: string;
  previousValue: KnownContextPrimitive;
}>;

export type CalculatorCorrectionIssue = Readonly<{
  issueId: string;
  issue: HandValidationIssue;
}>;

export type CalculatorStatus = Readonly<{
  structuralTileCount: number;
  physicalTileCount: number;
  targetStructuralTileCount: number;
  missingContextIds: readonly string[];
  correctionIssues: readonly CalculatorCorrectionIssue[];
  phase: CalculatorAnalysisPhase;
  canAnalyze: boolean;
  formalActionsAllowed: boolean;
}>;

export type CalculatorEvaluator = (
  document: CalculatorDocument,
  rulePackage: RulePackageDefinition,
) => Promise<SystemEvaluation> | SystemEvaluation;

export type CalculatorState = Readonly<{
  document: CalculatorDocument;
  rulePackage: RulePackageDefinition;
  concealedSortMode: ConcealedSortMode;
  editingMeldId: string | null;
  undoHand: HandSnapshot | null;
  analysisStatus: 'idle' | 'analyzing' | 'completed';
  analysisResult: SystemEvaluation | null;
  analysisAvailable: boolean;
  lastContextRemovals: readonly ContextRemoval[];
  contextBeforeModeChange: WinContext | null;
  addConcealedTile: (tile: TileCode) => CalculatorInputResult;
  removeConcealedTile: (originalIndex: number) => boolean;
  arrangeConcealedTiles: () => void;
  setWinningTile: (tile: TileCode) => CalculatorInputResult;
  removeWinningTile: () => boolean;
  confirmWinningTileFromConcealed: (originalIndex: number) => CalculatorInputResult;
  beginTransientInput: (
    kind: CalculatorTransientInputKind,
    openKind?: OpenKongKind,
  ) => CalculatorInputResult;
  beginMeldEdit: (meldId: string) => CalculatorInputResult;
  beginAddedKongUpgrade: (meldId: string) => CalculatorInputResult;
  selectTransientTile: (tile: TileCode) => TransientTileInputResult;
  removeTransientChowTile: (selectedIndex: number) => boolean;
  cancelTransientInput: () => boolean;
  removeMeld: (meldId: string) => boolean;
  removeFlower: (flowerIndex: number) => boolean;
  undoLastHandChange: () => boolean;
  setContextMode: (mode: WinMode) => readonly ContextRemoval[];
  updateContextValue: (contextId: string, value: KnownContextPrimitive) => CalculatorInputResult;
  clearContextValue: (contextId: string) => boolean;
  undoContextRemovals: () => boolean;
  clearCorrectionIssue: (issueId: string) => boolean;
  startAnalysis: () => Promise<CalculatorInputResult>;
  cancelAnalysis: () => boolean;
}>;

export type CalculatorStore = AppStore<CalculatorState>;

const ACCEPTED_INPUT: CalculatorInputResult = Object.freeze({ accepted: true });
const ACCEPTED_TRANSIENT_STEP: TransientTileInputResult = Object.freeze({
  accepted: true,
  completed: false,
});
const ACCEPTED_TRANSIENT_COMPLETION: TransientTileInputResult = Object.freeze({
  accepted: true,
  completed: true,
});

function rejectedInput(reasonCode: CalculatorInputRejection): CalculatorInputResult {
  return Object.freeze({ accepted: false, reasonCode });
}

function rejectedTransientInput(reasonCode: CalculatorInputRejection): TransientTileInputResult {
  return Object.freeze({ accepted: false, reasonCode });
}

function getRuleMeldType(meld: Meld): RuleMeldType {
  if (meld.type === 'chow') {
    return 'chow';
  }
  if (meld.type === 'pung') {
    return 'pung';
  }
  return meld.exposure === 'open' ? 'open-kong' : 'concealed-kong';
}

function getContextDefinition(
  rulePackage: RulePackageDefinition,
  contextId: string,
): ContextDefinition | undefined {
  return rulePackage.contexts.find((definition) => definition.contextId === contextId);
}

function contextValueAllowed(definition: ContextDefinition, value: KnownContextPrimitive): boolean {
  if (definition.valueType === 'boolean') return typeof value === 'boolean';
  if (definition.valueType === 'integer') return Number.isSafeInteger(value);
  if (definition.valueType === 'text') return typeof value === 'string';
  return definition.options?.some((option) => option.value === value) ?? false;
}

function collectContextRemovalsForMode(
  document: CalculatorDocument,
  rulePackage: RulePackageDefinition,
  mode: WinMode,
): readonly ContextRemoval[] {
  return Object.freeze(
    rulePackage.contexts.flatMap((definition) => {
      const currentValue = document.context.values[definition.contextId];
      if (
        currentValue === undefined ||
        !isKnownContextValue(currentValue) ||
        isContextDefinitionApplicable(definition, createWinContext(mode, document.context.values))
      ) {
        return [];
      }
      return [
        Object.freeze({ contextId: definition.contextId, previousValue: currentValue.value }),
      ];
    }),
  );
}

function removeContextValues(
  document: CalculatorDocument,
  removals: readonly ContextRemoval[],
  mode: WinMode,
) {
  const removalIds = new Set(removals.map(({ contextId }) => contextId));
  const values = Object.fromEntries(
    Object.entries(document.context.values).filter(([contextId]) => !removalIds.has(contextId)),
  );
  return createWinContext(mode, values);
}

export function getCorrectionIssues(
  document: CalculatorDocument,
  rulePackage: RulePackageDefinition,
): readonly CalculatorCorrectionIssue[] {
  const validation = validateHandSnapshot(document.hand, rulePackage.tileSet);
  return Object.freeze(
    validation.issues.map((issue, index) =>
      Object.freeze({
        issueId: `${issue.reasonCode}-${index}`,
        issue,
      }),
    ),
  );
}

function removeTileAtLocation(hand: HandSnapshot, location: HandTileLocation): HandSnapshot {
  switch (location.area) {
    case 'concealed':
      return createHandSnapshot({
        ...hand,
        concealed: hand.concealed.filter((_, index) => index !== location.index),
      });
    case 'winning-tile':
      return createHandSnapshot({ ...hand, winningTile: null });
    case 'flowers':
      return createHandSnapshot({
        ...hand,
        flowers: hand.flowers.filter((_, index) => index !== location.index),
      });
    case 'meld':
      return createHandSnapshot({
        ...hand,
        melds: hand.melds.filter((_, index) => index !== location.meldIndex),
      });
  }
}

function meldContainsTile(meld: Meld, tile: TileCode): boolean {
  if (meld.type === 'chow') return meld.tiles.includes(tile);
  return meld.tile === tile;
}

function clearCorrectionFromHand(hand: HandSnapshot, issue: HandValidationIssue): HandSnapshot {
  if ('location' in issue.data) {
    return removeTileAtLocation(hand, issue.data.location);
  }

  switch (issue.reasonCode) {
    case 'TILE_COPY_LIMIT_EXCEEDED': {
      const concealedIndex = hand.concealed.lastIndexOf(issue.data.tile);
      if (concealedIndex >= 0) {
        return removeTileAtLocation(hand, { area: 'concealed', index: concealedIndex });
      }
      if (hand.winningTile === issue.data.tile) {
        return removeTileAtLocation(hand, { area: 'winning-tile' });
      }
      const flowerIndex = hand.flowers.lastIndexOf(issue.data.tile);
      if (flowerIndex >= 0) {
        return removeTileAtLocation(hand, { area: 'flowers', index: flowerIndex });
      }
      const meldIndex = hand.melds.findLastIndex((meld) => meldContainsTile(meld, issue.data.tile));
      return meldIndex < 0
        ? hand
        : createHandSnapshot({
            ...hand,
            melds: hand.melds.filter((_, index) => index !== meldIndex),
          });
    }
    case 'INVALID_CHOW':
      return createHandSnapshot({
        ...hand,
        melds: hand.melds.filter(({ id }) => id !== issue.data.meldId),
      });
    case 'EMPTY_MELD_ID':
    case 'DUPLICATE_MELD_ID':
      return createHandSnapshot({
        ...hand,
        melds: hand.melds.filter((_, index) => index !== issue.data.meldIndex),
      });
  }

  return hand;
}

export function getCalculatorStatus(
  state: Pick<
    CalculatorState,
    'document' | 'rulePackage' | 'analysisStatus' | 'analysisResult' | 'analysisAvailable'
  >,
): CalculatorStatus {
  const counts = countHandStructure(state.document.hand);
  const correctionIssues = getCorrectionIssues(state.document, state.rulePackage);
  const missingContextIds = getMissingRequiredContextIds(
    state.document.context,
    state.rulePackage.contexts,
  );
  const target = state.rulePackage.handModel.targetStructuralTileCount;
  const hasCompleteStructure = counts.structuralTileCount === target;
  const formalActionsAllowed = correctionIssues.length === 0 && missingContextIds.length === 0;
  const phase: CalculatorAnalysisPhase =
    state.analysisStatus === 'analyzing'
      ? 'analyzing'
      : state.analysisStatus === 'completed' && state.analysisResult !== null
        ? 'result'
        : hasCompleteStructure
          ? 'ready'
          : 'insufficient';
  return Object.freeze({
    structuralTileCount: counts.structuralTileCount,
    physicalTileCount: counts.physicalTileCount,
    targetStructuralTileCount: target,
    missingContextIds,
    correctionIssues,
    phase,
    canAnalyze:
      phase === 'ready' &&
      formalActionsAllowed &&
      state.analysisAvailable &&
      state.document.hand.winningTile !== null,
    formalActionsAllowed,
  });
}

function getNextMeldId(document: CalculatorDocument): string {
  const existingIds = new Set(document.hand.melds.map(({ id }) => id));
  let sequence = 1;

  while (existingIds.has(`meld-${sequence}`)) {
    sequence += 1;
  }

  return `meld-${sequence}`;
}

function replaceOrAppendMeld(
  hand: HandSnapshot,
  meld: Meld,
  editingMeldId: string | null,
): HandSnapshot | null {
  if (editingMeldId === null) {
    return createHandSnapshot({ ...hand, melds: [...hand.melds, meld] });
  }

  const editingIndex = hand.melds.findIndex(({ id }) => id === editingMeldId);
  if (editingIndex < 0) {
    return null;
  }

  const melds = hand.melds.map((currentMeld, index) =>
    index === editingIndex ? meld : currentMeld,
  );
  return createHandSnapshot({ ...hand, melds });
}

function createTransientSession(
  kind: CalculatorTransientInputKind,
  openKind?: OpenKongKind,
): TransientInputSession {
  switch (kind) {
    case 'chow':
      return startChowInput();
    case 'pung':
      return startPungInput();
    case 'open-kong':
      return startOpenKongInput(openKind);
    case 'concealed-kong':
      return startConcealedKongInput();
    case 'flower':
      return startFlowerInput();
  }
}

function validateTileAvailability(
  tile: TileCode,
  rulePackage: RulePackageDefinition,
  counts: TileCountByCode,
  copiesToAdd = 1,
): CalculatorInputRejection | null {
  if (!rulePackage.tileSet.enabledTiles.includes(tile)) {
    return 'TILE_NOT_ENABLED';
  }

  const maximum = rulePackage.tileSet.maxCopies[tile];
  if (maximum !== undefined && getTileCount(counts, tile) + copiesToAdd > maximum) {
    return 'TILE_COPY_LIMIT_REACHED';
  }

  return null;
}

function mapHandValidationFailure(hand: HandSnapshot, rulePackage: RulePackageDefinition) {
  const validation = validateHandSnapshot(hand, rulePackage.tileSet);
  if (validation.isValid) {
    return null;
  }

  const issue = validation.issues[0];
  if (issue?.reasonCode === 'INVALID_CHOW') {
    return 'INVALID_CHOW' as const;
  }
  if (issue?.reasonCode === 'TILE_COPY_LIMIT_EXCEEDED') {
    return 'TILE_COPY_LIMIT_REACHED' as const;
  }
  if (issue?.reasonCode === 'TILE_NOT_ENABLED') {
    return 'TILE_NOT_ENABLED' as const;
  }
  if (issue?.reasonCode === 'NON_FLOWER_IN_FLOWER_AREA') {
    return 'TILE_NOT_FLOWER' as const;
  }
  return 'TILE_NOT_CONCEALED' as const;
}

function getHandWithoutEditingMeld(
  document: CalculatorDocument,
  editingMeldId: string | null,
): HandSnapshot {
  if (editingMeldId === null) {
    return document.hand;
  }

  return createHandSnapshot({
    ...document.hand,
    melds: document.hand.melds.filter(({ id }) => id !== editingMeldId),
  });
}

export function getInputLimitTileCounts(
  document: CalculatorDocument,
  editingMeldId: string | null,
): TileCountByCode {
  const counts = {
    ...countHandTilesByCode(getHandWithoutEditingMeld(document, editingMeldId)),
  };

  if (document.transientInput.kind === 'chow') {
    document.transientInput.selected.forEach((tile) => {
      counts[tile] = (counts[tile] ?? 0) + 1;
    });
  }

  return Object.freeze(counts);
}

export function getAddedKongUpgradeTile(
  document: CalculatorDocument,
  editingMeldId: string | null,
): TileCode | null {
  if (
    document.transientInput.kind !== 'open-kong' ||
    document.transientInput.openKind !== 'added'
  ) {
    return null;
  }

  const meld = document.hand.melds.find(({ id }) => id === editingMeldId);
  return meld?.type === 'pung' ? meld.tile : null;
}

export function getWinningTileConfirmation(
  document: CalculatorDocument,
  rulePackage: RulePackageDefinition,
): WinningTileConfirmation | null {
  if (
    document.hand.winningTile !== null ||
    document.hand.melds.length > 0 ||
    document.hand.concealed.length !== rulePackage.handModel.targetStructuralTileCount
  ) {
    return null;
  }

  const structure = enumerateWinningDecompositions({
    hand: document.hand,
    handModel: rulePackage.handModel,
    structures: rulePackage.structures,
  });

  return structure.decompositions.length === 0
    ? null
    : Object.freeze({ recommendedOriginalIndex: document.hand.concealed.length - 1 });
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
  evaluator?: CalculatorEvaluator,
): CalculatorStore {
  if (
    initialDocument.ruleRef.ruleId !== rulePackage.manifest.ruleId ||
    initialDocument.ruleRef.ruleVersion !== rulePackage.manifest.ruleVersion
  ) {
    throw new Error('CalculatorDocument RuleRef must match the supplied RulePackage.');
  }

  return createAppStore<CalculatorState>((set, get) => {
    const commitHand = (current: CalculatorState, hand: HandSnapshot): void => {
      set({
        document: reviseCalculatorDocument(current.document, {
          hand,
          transientInput: NO_TRANSIENT_INPUT,
        }),
        editingMeldId: null,
        undoHand: current.document.hand,
        analysisStatus: 'idle',
        analysisResult: null,
      });
    };

    const commitMeld = (current: CalculatorState, meld: Meld): TransientTileInputResult => {
      const ruleMeldType = getRuleMeldType(meld);
      if (!current.rulePackage.handModel.allowedMeldTypes.includes(ruleMeldType)) {
        return rejectedTransientInput('MELD_TYPE_NOT_ALLOWED');
      }

      if (
        current.editingMeldId === null &&
        current.document.hand.melds.length >= current.rulePackage.handModel.maxDeclaredMelds
      ) {
        return rejectedTransientInput('MELD_LIMIT_REACHED');
      }

      const hand = replaceOrAppendMeld(current.document.hand, meld, current.editingMeldId);
      if (hand === null) {
        return rejectedTransientInput('MELD_NOT_FOUND');
      }

      const failure = mapHandValidationFailure(hand, current.rulePackage);
      if (failure !== null) {
        return rejectedTransientInput(failure);
      }

      commitHand(current, hand);
      return ACCEPTED_TRANSIENT_COMPLETION;
    };

    return {
      document: initialDocument,
      rulePackage,
      concealedSortMode: 'input-order',
      editingMeldId: null,
      undoHand: null,
      analysisStatus: 'idle',
      analysisResult: null,
      analysisAvailable: evaluator !== undefined,
      lastContextRemovals: Object.freeze([]),
      contextBeforeModeChange: null,
      addConcealedTile: (tile) => {
        const current = get();
        const tileSet = current.rulePackage.tileSet;

        if (!tileSet.enabledTiles.includes(tile)) {
          return rejectedInput('TILE_NOT_ENABLED');
        }

        if (getTileMetadata(tile).kind === 'flower') {
          return rejectedInput('TILE_NOT_CONCEALED');
        }

        const failure = validateTileAvailability(
          tile,
          current.rulePackage,
          countHandTilesByCode(current.document.hand),
        );
        if (failure !== null) {
          return rejectedInput(failure);
        }

        const hand = createHandSnapshot({
          ...current.document.hand,
          concealed: [...current.document.hand.concealed, tile],
        });

        commitHand(current, hand);
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
        commitHand(current, createHandSnapshot({ ...current.document.hand, concealed }));
        return true;
      },
      arrangeConcealedTiles: () => set({ concealedSortMode: 'tile-order' }),
      setWinningTile: (tile) => {
        const current = get();
        if (getTileMetadata(tile).kind === 'flower') {
          return rejectedInput('TILE_NOT_CONCEALED');
        }

        const handWithoutWinningTile = createHandSnapshot({
          ...current.document.hand,
          winningTile: null,
        });
        const failure = validateTileAvailability(
          tile,
          current.rulePackage,
          countHandTilesByCode(handWithoutWinningTile),
        );
        if (failure !== null) {
          return rejectedInput(failure);
        }

        if (current.document.hand.winningTile === tile) {
          return ACCEPTED_INPUT;
        }

        commitHand(current, createHandSnapshot({ ...current.document.hand, winningTile: tile }));
        return ACCEPTED_INPUT;
      },
      removeWinningTile: () => {
        const current = get();
        if (current.document.hand.winningTile === null) {
          return false;
        }
        commitHand(current, createHandSnapshot({ ...current.document.hand, winningTile: null }));
        return true;
      },
      confirmWinningTileFromConcealed: (originalIndex) => {
        const current = get();
        if (
          getWinningTileConfirmation(current.document, current.rulePackage) === null ||
          !Number.isSafeInteger(originalIndex) ||
          originalIndex < 0 ||
          originalIndex >= current.document.hand.concealed.length
        ) {
          return rejectedInput('TILE_NOT_CONCEALED');
        }

        const tile = current.document.hand.concealed[originalIndex]!;
        const concealed = current.document.hand.concealed.filter(
          (_, index) => index !== originalIndex,
        );
        const hand = createHandSnapshot({ ...current.document.hand, concealed, winningTile: tile });
        const failure = mapHandValidationFailure(hand, current.rulePackage);
        if (failure !== null) {
          return rejectedInput(failure);
        }

        commitHand(current, hand);
        return ACCEPTED_INPUT;
      },
      beginTransientInput: (kind, openKind) => {
        const current = get();
        const ruleMeldType: RuleMeldType | null =
          kind === 'flower' ? null : kind === 'open-kong' ? 'open-kong' : kind;

        if (
          ruleMeldType !== null &&
          !current.rulePackage.handModel.allowedMeldTypes.includes(ruleMeldType)
        ) {
          return rejectedInput('MELD_TYPE_NOT_ALLOWED');
        }
        if (
          ruleMeldType !== null &&
          current.document.hand.melds.length >= current.rulePackage.handModel.maxDeclaredMelds
        ) {
          return rejectedInput('MELD_LIMIT_REACHED');
        }
        if (kind === 'flower' && current.rulePackage.handModel.flowerPolicy !== 'separate') {
          return rejectedInput('FLOWERS_NOT_SUPPORTED');
        }
        if (
          kind === 'open-kong' &&
          (openKind === undefined ||
            !current.rulePackage.handModel.openKongPolicy.allowedKinds.includes(openKind))
        ) {
          return rejectedInput('OPEN_KONG_KIND_NOT_ALLOWED');
        }

        set({
          document: reviseCalculatorDocument(current.document, {
            transientInput: createTransientSession(kind, openKind),
          }),
          editingMeldId: null,
        });
        return ACCEPTED_INPUT;
      },
      beginMeldEdit: (meldId) => {
        const current = get();
        const meld = current.document.hand.melds.find(({ id }) => id === meldId);
        if (meld === undefined) {
          return rejectedInput('MELD_NOT_FOUND');
        }

        const session =
          meld.type === 'chow'
            ? startChowInput()
            : meld.type === 'pung'
              ? startPungInput()
              : meld.exposure === 'open'
                ? startOpenKongInput(meld.openKind ?? 'direct')
                : startConcealedKongInput();

        set({
          document: reviseCalculatorDocument(current.document, { transientInput: session }),
          editingMeldId: meldId,
        });
        return ACCEPTED_INPUT;
      },
      beginAddedKongUpgrade: (meldId) => {
        const current = get();
        const meld = current.document.hand.melds.find(({ id }) => id === meldId);
        if (meld?.type !== 'pung') {
          return rejectedInput('MELD_NOT_FOUND');
        }
        if (!current.rulePackage.handModel.openKongPolicy.allowedKinds.includes('added')) {
          return rejectedInput('OPEN_KONG_KIND_NOT_ALLOWED');
        }

        set({
          document: reviseCalculatorDocument(current.document, {
            transientInput: startOpenKongInput('added'),
          }),
          editingMeldId: meldId,
        });
        return ACCEPTED_INPUT;
      },
      selectTransientTile: (tile) => {
        const current = get();
        const session = current.document.transientInput;
        if (session.kind === 'none') {
          return rejectedTransientInput('TRANSIENT_INPUT_NOT_ACTIVE');
        }

        const inputCounts = getInputLimitTileCounts(current.document, current.editingMeldId);
        const tileKind = getTileMetadata(tile).kind;

        if (session.kind === 'flower') {
          if (tileKind !== 'flower') {
            return rejectedTransientInput('TILE_NOT_FLOWER');
          }
          const availabilityFailure = validateTileAvailability(
            tile,
            current.rulePackage,
            inputCounts,
          );
          if (availabilityFailure !== null) {
            return rejectedTransientInput(availabilityFailure);
          }
          const hand = createHandSnapshot({
            ...current.document.hand,
            flowers: [...current.document.hand.flowers, tile],
          });
          const validationFailure = mapHandValidationFailure(hand, current.rulePackage);
          if (validationFailure !== null) {
            return rejectedTransientInput(validationFailure);
          }
          commitHand(current, hand);
          return ACCEPTED_TRANSIENT_COMPLETION;
        }

        if (tileKind === 'flower') {
          return rejectedTransientInput('TILE_NOT_CONCEALED');
        }

        if (session.kind === 'chow') {
          const availabilityFailure = validateTileAvailability(
            tile,
            current.rulePackage,
            inputCounts,
          );
          if (availabilityFailure !== null) {
            return rejectedTransientInput(availabilityFailure);
          }

          if (session.selected.length < 2) {
            set({
              document: reviseCalculatorDocument(current.document, {
                transientInput: addTransientChowTile(session, tile),
              }),
            });
            return ACCEPTED_TRANSIENT_STEP;
          }

          const meldId = current.editingMeldId ?? getNextMeldId(current.document);
          return commitMeld(
            current,
            createChowMeld(meldId, [session.selected[0]!, session.selected[1]!, tile]),
          );
        }

        const copiesToAdd = session.kind === 'pung' ? 3 : 4;
        const availabilityFailure = validateTileAvailability(
          tile,
          current.rulePackage,
          inputCounts,
          copiesToAdd,
        );
        if (availabilityFailure !== null) {
          return rejectedTransientInput(availabilityFailure);
        }

        const meldId = current.editingMeldId ?? getNextMeldId(current.document);
        if (session.kind === 'pung') {
          return commitMeld(current, createPungMeld(meldId, tile));
        }
        if (session.kind === 'concealed-kong') {
          return commitMeld(current, createConcealedKongMeld(meldId, tile));
        }

        if (
          !current.rulePackage.handModel.openKongPolicy.allowedKinds.includes(session.openKind!)
        ) {
          return rejectedTransientInput('OPEN_KONG_KIND_NOT_ALLOWED');
        }
        const addedKongTile = getAddedKongUpgradeTile(current.document, current.editingMeldId);
        if (addedKongTile !== null && addedKongTile !== tile) {
          return rejectedTransientInput('ADDED_KONG_TILE_MISMATCH');
        }
        return commitMeld(current, createOpenKongMeld(meldId, tile, session.openKind));
      },
      removeTransientChowTile: (selectedIndex) => {
        const current = get();
        if (current.document.transientInput.kind !== 'chow') {
          return false;
        }

        try {
          set({
            document: reviseCalculatorDocument(current.document, {
              transientInput: removeTransientChowTile(
                current.document.transientInput,
                selectedIndex,
              ),
            }),
          });
          return true;
        } catch (error) {
          if (error instanceof RangeError) {
            return false;
          }
          throw error;
        }
      },
      cancelTransientInput: () => {
        const current = get();
        if (current.document.transientInput.kind === 'none') {
          return false;
        }
        set({
          document: reviseCalculatorDocument(current.document, {
            transientInput: cancelTransientInput(),
          }),
          editingMeldId: null,
        });
        return true;
      },
      removeMeld: (meldId) => {
        const current = get();
        const melds = current.document.hand.melds.filter(({ id }) => id !== meldId);
        if (melds.length === current.document.hand.melds.length) {
          return false;
        }
        commitHand(current, createHandSnapshot({ ...current.document.hand, melds }));
        return true;
      },
      removeFlower: (flowerIndex) => {
        const current = get();
        if (
          !Number.isSafeInteger(flowerIndex) ||
          flowerIndex < 0 ||
          flowerIndex >= current.document.hand.flowers.length
        ) {
          return false;
        }
        const flowers = current.document.hand.flowers.filter((_, index) => index !== flowerIndex);
        commitHand(current, createHandSnapshot({ ...current.document.hand, flowers }));
        return true;
      },
      undoLastHandChange: () => {
        const current = get();
        if (current.undoHand === null) {
          return false;
        }
        set({
          document: reviseCalculatorDocument(current.document, {
            hand: current.undoHand,
            transientInput: NO_TRANSIENT_INPUT,
          }),
          editingMeldId: null,
          undoHand: null,
          analysisStatus: 'idle',
          analysisResult: null,
        });
        return true;
      },
      setContextMode: (mode) => {
        const current = get();
        if (current.document.context.mode === mode) return Object.freeze([]);
        const removals = collectContextRemovalsForMode(current.document, current.rulePackage, mode);
        set({
          document: reviseCalculatorDocument(current.document, {
            context: removeContextValues(current.document, removals, mode),
          }),
          lastContextRemovals: removals,
          contextBeforeModeChange: removals.length > 0 ? current.document.context : null,
          analysisStatus: 'idle',
          analysisResult: null,
        });
        return removals;
      },
      updateContextValue: (contextId, value) => {
        const current = get();
        const definition = getContextDefinition(current.rulePackage, contextId);
        if (
          definition === undefined ||
          !isContextDefinitionApplicable(definition, current.document.context)
        ) {
          return rejectedInput('CONTEXT_FIELD_NOT_AVAILABLE');
        }
        if (!contextValueAllowed(definition, value)) {
          return rejectedInput('CONTEXT_VALUE_INVALID');
        }
        const values = { ...current.document.context.values };
        if (definition.valueType !== 'boolean' || value === true) {
          for (const mutuallyExclusiveId of definition.mutuallyExclusiveWith ?? []) {
            delete values[mutuallyExclusiveId];
          }
        }
        const context = setContextValue(
          createWinContext(current.document.context.mode, values),
          contextId,
          knownContextValue(value),
        );
        set({
          document: reviseCalculatorDocument(current.document, { context }),
          lastContextRemovals: Object.freeze([]),
          contextBeforeModeChange: null,
          analysisStatus: 'idle',
          analysisResult: null,
        });
        return ACCEPTED_INPUT;
      },
      clearContextValue: (contextId) => {
        const current = get();
        if (current.document.context.values[contextId] === undefined) return false;
        const values = { ...current.document.context.values };
        delete values[contextId];
        set({
          document: reviseCalculatorDocument(current.document, {
            context: createWinContext(current.document.context.mode, values),
          }),
          lastContextRemovals: Object.freeze([]),
          contextBeforeModeChange: null,
          analysisStatus: 'idle',
          analysisResult: null,
        });
        return true;
      },
      undoContextRemovals: () => {
        const current = get();
        if (current.lastContextRemovals.length === 0 || current.contextBeforeModeChange === null) {
          return false;
        }
        set({
          document: reviseCalculatorDocument(current.document, {
            context: current.contextBeforeModeChange,
          }),
          lastContextRemovals: Object.freeze([]),
          contextBeforeModeChange: null,
          analysisStatus: 'idle',
          analysisResult: null,
        });
        return true;
      },
      clearCorrectionIssue: (issueId) => {
        const current = get();
        const validation = validateHandSnapshot(current.document.hand, current.rulePackage.tileSet);
        const separatorIndex = issueId.lastIndexOf('-');
        const issueIndex = Number(issueId.slice(separatorIndex + 1));
        const issue = validation.issues[issueIndex];
        if (
          issue === undefined ||
          !Number.isSafeInteger(issueIndex) ||
          `${issue.reasonCode}-${issueIndex}` !== issueId
        ) {
          return false;
        }
        const hand = clearCorrectionFromHand(current.document.hand, issue);
        if (hand === current.document.hand) return false;
        commitHand(current, hand);
        return true;
      },
      startAnalysis: async () => {
        const current = get();
        const status = getCalculatorStatus(current);
        if (evaluator === undefined) return rejectedInput('ANALYSIS_UNAVAILABLE');
        if (!status.canAnalyze) return rejectedInput('ANALYSIS_NOT_READY');
        const revision = current.document.revision;
        set({ analysisStatus: 'analyzing', analysisResult: null });
        let result: SystemEvaluation;
        try {
          result = await evaluator(current.document, current.rulePackage);
        } catch {
          if (get().document.revision === revision && get().analysisStatus === 'analyzing') {
            set({ analysisStatus: 'idle', analysisResult: null });
          }
          return rejectedInput('ANALYSIS_FAILED');
        }
        if (get().document.revision !== revision || get().analysisStatus !== 'analyzing') {
          return ACCEPTED_INPUT;
        }
        set({ analysisStatus: 'completed', analysisResult: result });
        return ACCEPTED_INPUT;
      },
      cancelAnalysis: () => {
        const current = get();
        if (current.analysisStatus !== 'analyzing') return false;
        set({ analysisStatus: 'idle', analysisResult: null });
        return true;
      },
    };
  });
}
