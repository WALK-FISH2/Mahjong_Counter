import type { PatternDefinition } from './pattern-definition';
import { canRuleEnterCalculator, type RuleManifest } from './rule-manifest';
import type { ScoringDefinition } from './scoring-definition';
import type { StructureDefinition } from './structure-definition';

export const CAPABILITY_KINDS = ['structure', 'recognizer', 'scoring'] as const;

export type CapabilityKind = (typeof CAPABILITY_KINDS)[number];

export type CapabilityDefinition = Readonly<{
  capabilityKey: string;
  kind: CapabilityKind;
}>;

export type CapabilityRegistry = Readonly<{
  capabilities: readonly CapabilityDefinition[];
}>;

export type RuleCalculationBlock = Readonly<{
  reasonCode:
    | 'RULE_STATUS_NOT_CALCULABLE'
    | 'UNKNOWN_CAPABILITY'
    | 'CAPABILITY_KIND_MISMATCH'
    | 'PATTERN_CAPABILITY_NOT_DECLARED'
    | 'STRUCTURE_CAPABILITY_NOT_DECLARED'
    | 'SCORING_CAPABILITY_NOT_DECLARED';
  data: Readonly<Record<string, string>>;
}>;

export type RuleCalculationReadiness = Readonly<{
  canCalculate: boolean;
  blocks: readonly RuleCalculationBlock[];
}>;

function validateCapabilityDefinition(definition: CapabilityDefinition): void {
  if (definition.capabilityKey.trim().length === 0) {
    throw new RangeError('Capability keys must not be empty.');
  }
}

export function createCapabilityRegistry(
  capabilities: readonly CapabilityDefinition[],
): CapabilityRegistry {
  const seen = new Set<string>();
  const copied = capabilities.map((capability) => {
    validateCapabilityDefinition(capability);
    if (seen.has(capability.capabilityKey)) {
      throw new RangeError(`Duplicate capability key: ${capability.capabilityKey}`);
    }
    seen.add(capability.capabilityKey);
    return Object.freeze({ ...capability });
  });

  return Object.freeze({ capabilities: Object.freeze(copied) });
}

export function getCapability(
  registry: CapabilityRegistry,
  capabilityKey: string,
): CapabilityDefinition | undefined {
  return registry.capabilities.find((capability) => capability.capabilityKey === capabilityKey);
}

function unknownCapabilityBlock(capabilityKey: string, referencedBy: string): RuleCalculationBlock {
  return Object.freeze({
    reasonCode: 'UNKNOWN_CAPABILITY',
    data: Object.freeze({ capabilityKey, referencedBy }),
  });
}

export function evaluateRuleCalculationReadiness(
  registry: CapabilityRegistry,
  manifest: Pick<RuleManifest, 'status' | 'engineCompatibility'>,
  patterns: readonly PatternDefinition[],
  structures: readonly StructureDefinition[] = [],
  scoring?: ScoringDefinition,
): RuleCalculationReadiness {
  const blocks: RuleCalculationBlock[] = [];
  const declaredCapabilities = new Set(manifest.engineCompatibility.requiredCapabilities);

  if (!canRuleEnterCalculator(manifest)) {
    blocks.push(
      Object.freeze({
        reasonCode: 'RULE_STATUS_NOT_CALCULABLE',
        data: Object.freeze({ status: manifest.status }),
      }),
    );
  }

  manifest.engineCompatibility.requiredCapabilities.forEach((capabilityKey) => {
    if (getCapability(registry, capabilityKey) === undefined) {
      blocks.push(unknownCapabilityBlock(capabilityKey, 'manifest'));
    }
  });

  patterns.forEach((pattern) => {
    if (!pattern.enabled) {
      return;
    }

    const capability = getCapability(registry, pattern.recognizerKey);
    if (capability === undefined) {
      blocks.push(unknownCapabilityBlock(pattern.recognizerKey, `pattern:${pattern.patternId}`));
      return;
    }

    if (capability.kind !== 'recognizer') {
      blocks.push(
        Object.freeze({
          reasonCode: 'CAPABILITY_KIND_MISMATCH',
          data: Object.freeze({
            capabilityKey: pattern.recognizerKey,
            expectedKind: 'recognizer',
            actualKind: capability.kind,
            patternId: pattern.patternId,
          }),
        }),
      );
    }

    if (!declaredCapabilities.has(pattern.recognizerKey)) {
      blocks.push(
        Object.freeze({
          reasonCode: 'PATTERN_CAPABILITY_NOT_DECLARED',
          data: Object.freeze({
            capabilityKey: pattern.recognizerKey,
            patternId: pattern.patternId,
          }),
        }),
      );
    }
  });

  structures.forEach((structure) => {
    if (structure.supportStatus === 'NOT_SUPPORTED_IN_V0_1') {
      return;
    }

    const capability = getCapability(registry, structure.capabilityKey);
    if (capability === undefined) {
      blocks.push(
        unknownCapabilityBlock(structure.capabilityKey, `structure:${structure.structureKey}`),
      );
      return;
    }

    if (capability.kind !== 'structure') {
      blocks.push(
        Object.freeze({
          reasonCode: 'CAPABILITY_KIND_MISMATCH',
          data: Object.freeze({
            capabilityKey: structure.capabilityKey,
            expectedKind: 'structure',
            actualKind: capability.kind,
            structureKey: structure.structureKey,
          }),
        }),
      );
    }

    if (structure.enabled && !declaredCapabilities.has(structure.capabilityKey)) {
      blocks.push(
        Object.freeze({
          reasonCode: 'STRUCTURE_CAPABILITY_NOT_DECLARED',
          data: Object.freeze({
            capabilityKey: structure.capabilityKey,
            structureKey: structure.structureKey,
          }),
        }),
      );
    }
  });

  const scoringCapabilityKeys =
    scoring === undefined
      ? []
      : [scoring.strategyKey, ...(scoring.extras?.map(({ calculatorKey }) => calculatorKey) ?? [])];

  scoringCapabilityKeys.forEach((capabilityKey) => {
    const capability = getCapability(registry, capabilityKey);
    if (capability === undefined) {
      blocks.push(unknownCapabilityBlock(capabilityKey, 'scoring'));
      return;
    }

    if (capability.kind !== 'scoring') {
      blocks.push(
        Object.freeze({
          reasonCode: 'CAPABILITY_KIND_MISMATCH',
          data: Object.freeze({
            capabilityKey,
            expectedKind: 'scoring',
            actualKind: capability.kind,
          }),
        }),
      );
    }

    if (!declaredCapabilities.has(capabilityKey)) {
      blocks.push(
        Object.freeze({
          reasonCode: 'SCORING_CAPABILITY_NOT_DECLARED',
          data: Object.freeze({ capabilityKey }),
        }),
      );
    }
  });

  return Object.freeze({
    canCalculate: blocks.length === 0,
    blocks: Object.freeze(blocks),
  });
}
