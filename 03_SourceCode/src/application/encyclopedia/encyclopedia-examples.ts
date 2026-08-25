import {
  createCalculatorDocument,
  createHandSnapshot,
  createWinContext,
  type CalculatorDocument,
  type HandSnapshotInput,
  type RuleRef,
  type WinContext,
} from '../../domain/mahjong';
import type { EncyclopediaExampleDefinition } from '../../domain/rules/encyclopedia-definition';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import { canRuleEnterCalculator, type RuleManifest } from '../../domain/rules/rule-manifest';
import type { StructureKey } from '../../domain/rules/structure-definition';
import type { CalculatorReplacement } from '../calculator/replace-calculator';

export type EncyclopediaRuleCase = Readonly<{
  id: string;
  ruleRef: RuleRef;
  title: string;
  tags: readonly string[];
  calculator: Readonly<{ hand: HandSnapshotInput; context?: WinContext }>;
  expected: Readonly<{
    status: 'STRUCTURAL_WIN' | 'NOT_WINNING';
    structureKeys: readonly StructureKey[];
    minimumDecompositionCount?: number;
    minimumWinningTilePlacementCount?: number;
    countedPatternIds?: readonly string[];
    excludedPatternIds?: readonly string[];
    description?: string;
  }>;
  sourceRefs: readonly string[];
}>;

export type EncyclopediaExampleDetail = Readonly<{
  definition: EncyclopediaExampleDefinition;
  ruleCase: EncyclopediaRuleCase;
}>;

export class EncyclopediaRuleCaseReferenceError extends Error {
  constructor(
    readonly exampleId: string,
    readonly ruleCaseId: string,
  ) {
    super(`Encyclopedia example ${exampleId} references an unavailable Rule Case ${ruleCaseId}.`);
    this.name = 'EncyclopediaRuleCaseReferenceError';
  }
}

export function canBringEncyclopediaExampleIntoCalculator(
  manifest: Pick<RuleManifest, 'status'>,
): boolean {
  return canRuleEnterCalculator(manifest);
}

function sameRule(left: RuleRef, right: RuleRef): boolean {
  return left.ruleId === right.ruleId && left.ruleVersion === right.ruleVersion;
}

export function listEncyclopediaExamples(
  rulePackage: RulePackageDefinition,
  ruleCases: readonly EncyclopediaRuleCase[],
): readonly EncyclopediaExampleDetail[] {
  const cases = new Map(ruleCases.map((ruleCase) => [ruleCase.id, ruleCase]));
  const ruleRef = rulePackage.manifest;

  return Object.freeze(
    rulePackage.encyclopedia.examples.map((definition) => {
      const ruleCase = cases.get(definition.ruleCaseId);
      if (ruleCase === undefined || !sameRule(ruleCase.ruleRef, ruleRef)) {
        throw new EncyclopediaRuleCaseReferenceError(definition.exampleId, definition.ruleCaseId);
      }
      return Object.freeze({ definition, ruleCase });
    }),
  );
}

export function findEncyclopediaExample(
  rulePackage: RulePackageDefinition,
  ruleCases: readonly EncyclopediaRuleCase[],
  exampleId: string,
): EncyclopediaExampleDetail | undefined {
  return listEncyclopediaExamples(rulePackage, ruleCases).find(
    ({ definition }) => definition.exampleId === exampleId,
  );
}

export function createEncyclopediaExampleReplacement(
  current: CalculatorDocument,
  rulePackage: RulePackageDefinition,
  example: EncyclopediaExampleDetail,
): CalculatorReplacement {
  return Object.freeze({
    rulePackage,
    document: createCalculatorDocument({
      schemaVersion: current.schemaVersion,
      ruleRef: {
        ruleId: rulePackage.manifest.ruleId,
        ruleVersion: rulePackage.manifest.ruleVersion,
      },
      hand: createHandSnapshot(example.ruleCase.calculator.hand),
      context:
        example.ruleCase.calculator.context === undefined
          ? createWinContext('discard')
          : createWinContext(
              example.ruleCase.calculator.context.mode,
              example.ruleCase.calculator.context.values,
            ),
      temporaryRuleAdjustment: null,
      fanAdjustments: [],
      source: {
        kind: 'encyclopedia-example',
        exampleId: example.definition.exampleId,
      },
      revision: current.revision + 1,
    }),
  });
}
