import {
  NO_TRANSIENT_INPUT,
  createCalculatorDocument,
  createHandSnapshot,
  createWinContext,
  getTileMetadata,
  isKnownContextValue,
  validateHandSnapshot,
  type CalculatorDocument,
  type HandSnapshot,
  type Meld,
  type RuleRef,
  type TileCode,
} from '../../domain/mahjong';
import type { ContextDefinition } from '../../domain/rules/context-definition';
import type { RuleMeldType } from '../../domain/rules/hand-model';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import { createInitialCalculatorDocument, type CalculatorStore } from './calculator-store';
import type { DraftProtectionPort } from '../analysis-lifecycle';

export const CALCULATOR_REPLACEMENT_REASONS = [
  'new-hand',
  'rule-switch',
  'share',
  'import',
  'encyclopedia-example',
  'saved-example',
] as const;

export type CalculatorReplacementReason = (typeof CALCULATOR_REPLACEMENT_REASONS)[number];
export type RuleSwitchCompatibilityMode = 'remove-incompatible' | 'preserve-and-correct' | 'clear';

export interface CalculatorDraftPort {
  protectBeforeReplacement(
    document: CalculatorDocument,
    reason: CalculatorReplacementReason,
  ): Promise<void>;
}

export type CalculatorReplacement = Readonly<{
  document: CalculatorDocument;
  rulePackage: RulePackageDefinition;
  recordRuleSwitchUndo?: boolean;
}>;

export type ReplaceCalculatorResult =
  | Readonly<{ status: 'replaced' }>
  | Readonly<{ status: 'cancelled' }>
  | Readonly<{ status: 'draft-protection-failed'; error: unknown }>;

export type ReplaceCalculatorConfirmation = (
  reason: CalculatorReplacementReason,
) => Promise<boolean> | boolean;

export class InMemoryCalculatorDraftPort implements CalculatorDraftPort, DraftProtectionPort {
  #lastProtected: Readonly<{
    document: CalculatorDocument;
    reason: CalculatorReplacementReason | 'engine-error';
  }> | null = null;

  protectBeforeReplacement(
    document: CalculatorDocument,
    reason: CalculatorReplacementReason,
  ): Promise<void> {
    this.#lastProtected = Object.freeze({ document, reason });
    return Promise.resolve();
  }

  protectCurrentDraft(document: CalculatorDocument): Promise<void> {
    this.#lastProtected = Object.freeze({ document, reason: 'engine-error' });
    return Promise.resolve();
  }

  getLastProtected() {
    return this.#lastProtected;
  }
}

export function createCalculatorReplaceGuard(
  store: CalculatorStore,
  draftPort: CalculatorDraftPort,
) {
  return Object.freeze({
    async prepareToReplaceCalculator(
      reason: CalculatorReplacementReason,
      confirm: ReplaceCalculatorConfirmation,
      createReplacement: () => Promise<CalculatorReplacement> | CalculatorReplacement,
    ): Promise<ReplaceCalculatorResult> {
      const currentDocument = store.getState().document;

      try {
        await draftPort.protectBeforeReplacement(currentDocument, reason);
      } catch (error) {
        return Object.freeze({ status: 'draft-protection-failed', error });
      }

      if (!(await confirm(reason))) {
        return Object.freeze({ status: 'cancelled' });
      }

      const replacement = await createReplacement();
      store
        .getState()
        .replaceCalculator(
          replacement.rulePackage,
          replacement.document,
          replacement.recordRuleSwitchUndo ?? false,
        );
      return Object.freeze({ status: 'replaced' });
    },
  });
}

export function createNewHandReplacement(
  rulePackage: RulePackageDefinition,
): CalculatorReplacement {
  return Object.freeze({
    rulePackage,
    document: createInitialCalculatorDocument(rulePackage),
  });
}

function getRuleMeldType(meld: Meld): RuleMeldType {
  if (meld.type === 'chow') return 'chow';
  if (meld.type === 'pung') return 'pung';
  return meld.exposure === 'open' ? 'open-kong' : 'concealed-kong';
}

function getMeldTiles(meld: Meld): readonly TileCode[] {
  if (meld.type === 'chow') return meld.tiles;
  if (meld.type === 'pung') return [meld.tile, meld.tile, meld.tile];
  return [meld.tile, meld.tile, meld.tile, meld.tile];
}

function contextValueAllowed(definition: ContextDefinition, value: unknown): boolean {
  if (definition.valueType === 'boolean') return typeof value === 'boolean';
  if (definition.valueType === 'integer') return Number.isSafeInteger(value);
  if (definition.valueType === 'text') return typeof value === 'string';
  return definition.options?.some((option) => option.value === value) ?? false;
}

function canAddTiles(
  counts: Readonly<Partial<Record<TileCode, number>>>,
  tiles: readonly TileCode[],
  rulePackage: RulePackageDefinition,
): boolean {
  const additions: Partial<Record<TileCode, number>> = {};
  for (const tile of tiles) {
    if (!rulePackage.tileSet.enabledTiles.includes(tile)) return false;
    additions[tile] = (additions[tile] ?? 0) + 1;
    const maximum = rulePackage.tileSet.maxCopies[tile];
    if (maximum !== undefined && (counts[tile] ?? 0) + (additions[tile] ?? 0) > maximum)
      return false;
  }
  return true;
}

function addCounts(counts: Partial<Record<TileCode, number>>, tiles: readonly TileCode[]): void {
  tiles.forEach((tile) => {
    counts[tile] = (counts[tile] ?? 0) + 1;
  });
}

function retainCompatibleHand(
  hand: HandSnapshot,
  rulePackage: RulePackageDefinition,
): HandSnapshot {
  const counts: Partial<Record<TileCode, number>> = {};
  const concealed = hand.concealed.filter((tile) => {
    if (getTileMetadata(tile).kind === 'flower' || !canAddTiles(counts, [tile], rulePackage)) {
      return false;
    }
    addCounts(counts, [tile]);
    return true;
  });
  const melds: Meld[] = [];

  for (const meld of hand.melds) {
    const meldTiles = getMeldTiles(meld);
    if (
      melds.length >= rulePackage.handModel.maxDeclaredMelds ||
      !rulePackage.handModel.allowedMeldTypes.includes(getRuleMeldType(meld)) ||
      !canAddTiles(counts, meldTiles, rulePackage)
    ) {
      continue;
    }

    const candidate = createHandSnapshot({ concealed, melds: [...melds, meld] });
    if (!validateHandSnapshot(candidate, rulePackage.tileSet).isValid) continue;
    melds.push(meld);
    addCounts(counts, meldTiles);
  }

  const winningTile =
    hand.winningTile !== null &&
    getTileMetadata(hand.winningTile).kind !== 'flower' &&
    canAddTiles(counts, [hand.winningTile], rulePackage)
      ? hand.winningTile
      : null;
  if (winningTile !== null) addCounts(counts, [winningTile]);

  const flowers =
    rulePackage.handModel.flowerPolicy === 'separate'
      ? hand.flowers.filter((tile) => {
          if (
            getTileMetadata(tile).kind !== 'flower' ||
            !canAddTiles(counts, [tile], rulePackage)
          ) {
            return false;
          }
          addCounts(counts, [tile]);
          return true;
        })
      : [];

  return createHandSnapshot({ concealed, melds, flowers, winningTile });
}

function retainCompatibleContext(document: CalculatorDocument, rulePackage: RulePackageDefinition) {
  const definitions = new Map(
    rulePackage.contexts.map((definition) => [definition.contextId, definition]),
  );
  const values = Object.fromEntries(
    Object.entries(document.context.values).filter(([contextId, value]) => {
      const definition = definitions.get(contextId);
      return (
        definition !== undefined &&
        isKnownContextValue(value) &&
        contextValueAllowed(definition, value.value)
      );
    }),
  );
  return createWinContext(document.context.mode, values);
}

function switchedDocument(
  current: CalculatorDocument,
  target: RulePackageDefinition,
  mode: Exclude<RuleSwitchCompatibilityMode, 'clear'>,
): CalculatorDocument {
  const targetRef: RuleRef = {
    ruleId: target.manifest.ruleId,
    ruleVersion: target.manifest.ruleVersion,
  };

  return createCalculatorDocument({
    schemaVersion: current.schemaVersion,
    ruleRef: targetRef,
    hand:
      mode === 'remove-incompatible' ? retainCompatibleHand(current.hand, target) : current.hand,
    context:
      mode === 'remove-incompatible' ? retainCompatibleContext(current, target) : current.context,
    temporaryRuleAdjustment: null,
    fanAdjustments: [],
    transientInput: NO_TRANSIENT_INPUT,
    source: { kind: 'new' },
    revision: current.revision + 1,
  });
}

export function createRuleSwitchReplacement(
  current: CalculatorDocument,
  target: RulePackageDefinition,
  mode: RuleSwitchCompatibilityMode,
): CalculatorReplacement {
  return Object.freeze({
    rulePackage: target,
    document:
      mode === 'clear'
        ? createInitialCalculatorDocument(target)
        : switchedDocument(current, target, mode),
    recordRuleSwitchUndo: true,
  });
}
