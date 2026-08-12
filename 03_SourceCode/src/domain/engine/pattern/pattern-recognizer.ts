import type { RuleDataObject } from '../../rules/rule-data';
import type { PatternDefinition } from '../../rules/pattern-definition';
import type { StructureDefinition, StructureKey } from '../../rules/structure-definition';
import type { HandSnapshot } from '../../mahjong/hand';
import type { WinContext } from '../../mahjong/context';
import type { PlacedWinningDecomposition } from '../structure/winning-tile-placement';
import { deriveFacts, type DerivedFacts } from './derived-facts';

export type PatternEvidence = Readonly<{
  evidenceType: string;
  facts: RuleDataObject;
}>;

export type PatternRecognizerInput = Readonly<{
  pattern: PatternDefinition;
  facts: DerivedFacts;
}>;

export type PatternRecognizer = Readonly<{
  recognizerKey: string;
  recognize: (input: PatternRecognizerInput) => readonly PatternEvidence[];
}>;

export type PatternRecognizerRegistry = Readonly<{
  recognizers: readonly PatternRecognizer[];
}>;

export type PatternCandidate = Readonly<{
  patternId: string;
  recognizerKey: string;
  occurrences: number;
  evidence: readonly PatternEvidence[];
}>;

export type UnsupportedPattern = Readonly<{
  patternId: string;
  reasonCode: 'STRUCTURE_NOT_IMPLEMENTED';
  structureKey: string;
}>;

export type PatternRecognitionResult = Readonly<{
  candidates: readonly PatternCandidate[];
  unsupportedPatterns: readonly UnsupportedPattern[];
}>;

export type PlacedPatternRecognitionResult = Readonly<{
  placed: PlacedWinningDecomposition;
  facts: DerivedFacts;
  recognition: PatternRecognitionResult;
}>;

export class PatternRecognizerUnavailableError extends Error {
  readonly recognizerKey: string;

  constructor(recognizerKey: string) {
    super(`Pattern recognizer is unavailable: ${recognizerKey}`);
    this.name = 'PatternRecognizerUnavailableError';
    this.recognizerKey = recognizerKey;
  }
}

export function evidence(evidenceType: string, facts: RuleDataObject): PatternEvidence {
  return Object.freeze({ evidenceType, facts: Object.freeze({ ...facts }) });
}

export function createPatternRecognizerRegistry(
  recognizers: readonly PatternRecognizer[],
): PatternRecognizerRegistry {
  const seen = new Set<string>();
  const copied = recognizers.map((recognizer) => {
    if (recognizer.recognizerKey.trim().length === 0) {
      throw new RangeError('Pattern recognizer keys must not be empty.');
    }
    if (seen.has(recognizer.recognizerKey)) {
      throw new RangeError(`Duplicate Pattern recognizer key: ${recognizer.recognizerKey}`);
    }
    seen.add(recognizer.recognizerKey);
    return Object.freeze({ ...recognizer });
  });
  return Object.freeze({ recognizers: Object.freeze(copied) });
}

export function getPatternRecognizer(
  registry: PatternRecognizerRegistry,
  recognizerKey: string,
): PatternRecognizer | undefined {
  return registry.recognizers.find((recognizer) => recognizer.recognizerKey === recognizerKey);
}

export function getPatternRecognizerCapabilityKeys(
  registry: PatternRecognizerRegistry,
): readonly string[] {
  return Object.freeze(registry.recognizers.map(({ recognizerKey }) => recognizerKey));
}

function requiredStructureKey(pattern: PatternDefinition): StructureKey | null {
  const value = pattern.recognizerParams?.requiredStructureKey;
  return typeof value === 'string' ? (value as StructureKey) : null;
}

export function recognizePatterns(
  patterns: readonly PatternDefinition[],
  structures: readonly StructureDefinition[],
  registry: PatternRecognizerRegistry,
  facts: DerivedFacts,
): PatternRecognitionResult {
  const candidates: PatternCandidate[] = [];
  const unsupportedPatterns: UnsupportedPattern[] = [];
  const structuresByKey = new Map(
    structures.map((structure) => [structure.structureKey, structure]),
  );

  patterns.forEach((pattern) => {
    if (!pattern.enabled) {
      const structureKey = requiredStructureKey(pattern);
      if (structureKey === null) {
        return;
      }
      const structure = structuresByKey.get(structureKey);
      if (structure?.supportStatus === 'NOT_SUPPORTED_IN_V0_1') {
        unsupportedPatterns.push(
          Object.freeze({
            patternId: pattern.patternId,
            reasonCode: structure.reasonCode,
            structureKey,
          }),
        );
      }
      return;
    }

    const recognizer = getPatternRecognizer(registry, pattern.recognizerKey);
    if (recognizer === undefined) {
      throw new PatternRecognizerUnavailableError(pattern.recognizerKey);
    }
    const recognizedEvidence = Object.freeze([...recognizer.recognize({ pattern, facts })]);
    if (recognizedEvidence.length > 0) {
      candidates.push(
        Object.freeze({
          patternId: pattern.patternId,
          recognizerKey: pattern.recognizerKey,
          occurrences: recognizedEvidence.length,
          evidence: recognizedEvidence,
        }),
      );
    }
  });

  return Object.freeze({
    candidates: Object.freeze(candidates),
    unsupportedPatterns: Object.freeze(unsupportedPatterns),
  });
}

export function recognizePlacedCandidates(
  hand: HandSnapshot,
  context: WinContext,
  placedCandidates: readonly PlacedWinningDecomposition[],
  patterns: readonly PatternDefinition[],
  structures: readonly StructureDefinition[],
  registry: PatternRecognizerRegistry,
): readonly PlacedPatternRecognitionResult[] {
  return Object.freeze(
    placedCandidates.map((placed) => {
      const facts = deriveFacts(hand, context, placed);
      return Object.freeze({
        placed,
        facts,
        recognition: recognizePatterns(patterns, structures, registry, facts),
      });
    }),
  );
}
