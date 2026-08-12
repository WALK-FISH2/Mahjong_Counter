import type { HandSnapshot } from '../../mahjong/hand';
import { countHandStructure } from '../../mahjong/hand-count';
import type { HandModelDefinition } from '../../rules/hand-model';
import type { StructureDefinition, StructureKey } from '../../rules/structure-definition';
import {
  enumerateSevenPairsDecompositions,
  enumerateThirteenOrphansDecompositions,
  type SevenPairsDecomposition,
  type ThirteenOrphansDecomposition,
} from './special-decomposition';
import {
  enumerateStandardDecompositions,
  getStandardDecompositionKey,
  type StandardDecomposition,
} from './standard-decomposition';

export type WinningDecomposition =
  StandardDecomposition | SevenPairsDecomposition | ThirteenOrphansDecomposition;

export type StructureEnumerationInput = Readonly<{
  hand: HandSnapshot;
  handModel: HandModelDefinition;
  structures: readonly StructureDefinition[];
}>;

export type StructureEnumerationResult = Readonly<{
  decompositions: readonly WinningDecomposition[];
  unsupportedStructures: readonly StructureKey[];
  unavailableCapabilities: readonly string[];
}>;

export function getWinningDecompositionKey(decomposition: WinningDecomposition): string {
  switch (decomposition.structureKey) {
    case 'standard-meld-pair':
      return `${decomposition.structureKey}:${getStandardDecompositionKey(decomposition)}`;
    case 'seven-pairs':
      return `${decomposition.structureKey}:${decomposition.pairs.join('|')}`;
    case 'thirteen-orphans':
      return `${decomposition.structureKey}:${decomposition.requiredTiles.join('|')}:${decomposition.pairTile}`;
  }
}

function enumerateSupportedStructure(
  definition: Extract<StructureDefinition, { supportStatus: 'SUPPORTED' }>,
  hand: HandSnapshot,
  handModel: HandModelDefinition,
): readonly WinningDecomposition[] {
  switch (definition.capabilityKey) {
    case 'structure.standard':
      return definition.structureKey === 'standard-meld-pair'
        ? enumerateStandardDecompositions({ hand, handModel })
        : Object.freeze([]);
    case 'structure.sevenPairs':
      return definition.structureKey === 'seven-pairs'
        ? enumerateSevenPairsDecompositions(hand, definition)
        : Object.freeze([]);
    case 'structure.thirteenOrphans':
      return definition.structureKey === 'thirteen-orphans'
        ? enumerateThirteenOrphansDecompositions(hand, definition)
        : Object.freeze([]);
    default:
      return Object.freeze([]);
  }
}

function isAvailableStructureCapability(
  definition: Extract<StructureDefinition, { supportStatus: 'SUPPORTED' }>,
): boolean {
  return (
    (definition.structureKey === 'standard-meld-pair' &&
      definition.capabilityKey === 'structure.standard') ||
    (definition.structureKey === 'seven-pairs' &&
      definition.capabilityKey === 'structure.sevenPairs') ||
    (definition.structureKey === 'thirteen-orphans' &&
      definition.capabilityKey === 'structure.thirteenOrphans')
  );
}

export function enumerateWinningDecompositions(
  input: StructureEnumerationInput,
): StructureEnumerationResult {
  const unique = new Map<string, WinningDecomposition>();
  const unsupportedStructures: StructureKey[] = [];
  const unavailableCapabilities: string[] = [];

  const hasTargetStructuralTileCount =
    countHandStructure(input.hand).structuralTileCount ===
    input.handModel.targetStructuralTileCount;

  for (const structure of input.structures) {
    if (structure.supportStatus === 'NOT_SUPPORTED_IN_V0_1') {
      unsupportedStructures.push(structure.structureKey);
      continue;
    }

    if (!structure.enabled) {
      continue;
    }

    if (!hasTargetStructuralTileCount) {
      continue;
    }

    if (!isAvailableStructureCapability(structure)) {
      unavailableCapabilities.push(structure.capabilityKey);
      continue;
    }

    for (const decomposition of enumerateSupportedStructure(
      structure,
      input.hand,
      input.handModel,
    )) {
      const key = getWinningDecompositionKey(decomposition);
      if (!unique.has(key)) {
        unique.set(key, decomposition);
      }
    }
  }

  const decompositions = [...unique.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left === right ? 0 : 1))
    .map(([, decomposition]) => decomposition);

  return Object.freeze({
    decompositions: Object.freeze(decompositions),
    unsupportedStructures: Object.freeze([...new Set(unsupportedStructures)].sort()),
    unavailableCapabilities: Object.freeze([...new Set(unavailableCapabilities)].sort()),
  });
}
