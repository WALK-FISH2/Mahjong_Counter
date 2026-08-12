import type { CapabilityRegistry } from '../../domain/rules/capability-registry';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import type { PatternRecognizerRegistry } from '../../domain/engine/pattern/pattern-recognizer';
import { ruleCorpusIndexSchema } from '../../schemas/rule-package/rule-corpus-index-schema';
import {
  RulePackageValidationError,
  validateRulePackageInput,
} from '../rule-repository/validate-rule-package';
import { parseRuleSpecSnapshot, type RuleSpecSnapshot } from './rule-spec-snapshot';

export type BuildTimeRuleValidationIssueCode =
  | 'RULE_SPEC_INVALID'
  | 'RULE_PACKAGE_INVALID'
  | 'RULE_ID_DRIFT'
  | 'RULE_VERSION_DRIFT'
  | 'DISPLAY_NAME_DRIFT'
  | 'RULE_STATUS_DRIFT'
  | 'PATTERN_COUNT_DRIFT'
  | 'ENABLED_PATTERN_COUNT_DRIFT'
  | 'DISABLED_PATTERN_COUNT_DRIFT'
  | 'PATTERN_CATALOG_DRIFT'
  | 'TILE_COUNT_DRIFT'
  | 'HAND_MODEL_DRIFT'
  | 'STRUCTURE_DRIFT'
  | 'LEGALITY_DRIFT'
  | 'SCORING_DRIFT'
  | 'SOURCE_DRIFT'
  | 'CORPUS_INVALID'
  | 'CORPUS_RULE_ID_DRIFT'
  | 'CORPUS_RULE_VERSION_DRIFT'
  | 'RULE_CASE_REFERENCE_INVALID'
  | 'FORBIDDEN_PLATFORM_RULE';

export type BuildTimeRuleValidationIssue = Readonly<{
  code: BuildTimeRuleValidationIssueCode;
  message: string;
}>;

export class BuildTimeRuleValidationError extends Error {
  readonly issues: readonly BuildTimeRuleValidationIssue[];

  constructor(issues: readonly BuildTimeRuleValidationIssue[]) {
    super(issues.map(({ code }) => code).join(', '));
    this.name = 'BuildTimeRuleValidationError';
    this.issues = Object.freeze([...issues]);
  }
}

export type RuleStructureMapping = Readonly<{
  specKey: keyof RuleSpecSnapshot['structures'];
  structureKey: string;
}>;

export type BuildTimeRuleValidationContract = Readonly<{
  structureMappings: readonly RuleStructureMapping[];
  scoringStrategyKey: string;
  selfDrawExtraId: string;
  flowerExtraId: string;
  forbiddenPlatformKeys: readonly string[];
}>;

export type BuildTimeRuleValidationInput = Readonly<{
  rulePackageInput: unknown;
  ruleCorpusInput: unknown;
  capabilityRegistry: CapabilityRegistry;
  patternRecognizerRegistry?: PatternRecognizerRegistry;
  ruleSpecMarkdown: string;
  contract: BuildTimeRuleValidationContract;
}>;

export type BuildTimeRuleValidationReport = Readonly<{
  ruleId: string;
  ruleVersion: string;
  patternCount: number;
  enabledPatternCount: number;
  disabledPatternCount: number;
  sourceCount: number;
}>;

function addIssue(
  issues: BuildTimeRuleValidationIssue[],
  code: BuildTimeRuleValidationIssueCode,
  message: string,
): void {
  issues.push({ code, message });
}

function compareIdentity(
  rulePackage: RulePackageDefinition,
  spec: RuleSpecSnapshot,
  issues: BuildTimeRuleValidationIssue[],
): void {
  if (rulePackage.manifest.ruleId !== spec.ruleId) {
    addIssue(issues, 'RULE_ID_DRIFT', 'RulePackage Rule ID differs from the Rule Spec.');
  }
  if (rulePackage.manifest.ruleVersion !== spec.ruleVersion) {
    addIssue(issues, 'RULE_VERSION_DRIFT', 'RulePackage Rule Version differs from the Rule Spec.');
  }
  if (rulePackage.manifest.displayName !== spec.displayName) {
    addIssue(issues, 'DISPLAY_NAME_DRIFT', 'RulePackage display name differs from the Rule Spec.');
  }
  if (rulePackage.manifest.status !== spec.status) {
    addIssue(issues, 'RULE_STATUS_DRIFT', 'RulePackage status differs from the Rule Spec.');
  }
}

function comparePatterns(
  rulePackage: RulePackageDefinition,
  spec: RuleSpecSnapshot,
  issues: BuildTimeRuleValidationIssue[],
): void {
  const enabledCount = rulePackage.patterns.filter(({ enabled }) => enabled).length;
  const disabledCount = rulePackage.patterns.length - enabledCount;

  if (
    rulePackage.patterns.length !== spec.totalReferencePatterns ||
    spec.patterns.length !== spec.totalReferencePatterns
  ) {
    addIssue(issues, 'PATTERN_COUNT_DRIFT', 'Reference Pattern count differs from the Rule Spec.');
  }
  if (enabledCount !== spec.enabledPatterns) {
    addIssue(
      issues,
      'ENABLED_PATTERN_COUNT_DRIFT',
      'Enabled Pattern count differs from the Rule Spec.',
    );
  }
  if (disabledCount !== spec.disabledForCurrentStructureScope) {
    addIssue(
      issues,
      'DISABLED_PATTERN_COUNT_DRIFT',
      'Disabled Pattern count differs from the Rule Spec.',
    );
  }

  const actualFacts = rulePackage.patterns.map(({ patternId, name, value, enabled }) => ({
    patternId,
    name,
    value,
    enabled,
  }));
  if (JSON.stringify(actualFacts) !== JSON.stringify(spec.patterns)) {
    addIssue(
      issues,
      'PATTERN_CATALOG_DRIFT',
      'Pattern IDs, names, values, order, or support states differ from the Rule Spec.',
    );
  }
}

function compareTileAndHandFacts(
  rulePackage: RulePackageDefinition,
  spec: RuleSpecSnapshot,
  issues: BuildTimeRuleValidationIssue[],
): void {
  const physicalTileCount = rulePackage.tileSet.enabledTiles.reduce(
    (total, tile) => total + (rulePackage.tileSet.maxCopies[tile] ?? 0),
    0,
  );
  if (physicalTileCount !== spec.physicalTileCount) {
    addIssue(issues, 'TILE_COUNT_DRIFT', 'Physical tile count differs from the Rule Spec.');
  }

  const { handModel } = rulePackage;
  if (
    handModel.targetStructuralTileCount !== spec.targetStructuralTileCount ||
    handModel.readyStructuralTileCount !== spec.readyStructuralTileCount ||
    handModel.requiredMeldCount !== spec.requiredMeldCount
  ) {
    addIssue(issues, 'HAND_MODEL_DRIFT', 'Hand Model counts differ from the Rule Spec.');
  }
}

function compareStructures(
  rulePackage: RulePackageDefinition,
  spec: RuleSpecSnapshot,
  contract: BuildTimeRuleValidationContract,
  issues: BuildTimeRuleValidationIssue[],
): void {
  const structures = new Map<string, (typeof rulePackage.structures)[number]>(
    rulePackage.structures.map((structure) => [structure.structureKey, structure]),
  );
  const hasDrift = contract.structureMappings.some(({ specKey, structureKey }) => {
    const expectedEnabled = spec.structures[specKey];
    const actual = structures.get(structureKey);
    if (actual === undefined || actual.enabled !== expectedEnabled) {
      return true;
    }
    return expectedEnabled
      ? actual.supportStatus !== 'SUPPORTED'
      : actual.supportStatus !== 'NOT_SUPPORTED_IN_V0_1' ||
          actual.reasonCode !== 'STRUCTURE_NOT_IMPLEMENTED';
  });

  if (hasDrift || structures.size !== contract.structureMappings.length) {
    addIssue(issues, 'STRUCTURE_DRIFT', 'Structure support states differ from the Rule Spec.');
  }
}

function compareScoring(
  rulePackage: RulePackageDefinition,
  spec: RuleSpecSnapshot,
  contract: BuildTimeRuleValidationContract,
  issues: BuildTimeRuleValidationIssue[],
): void {
  if (rulePackage.legality.minimumFan !== spec.minimumFan) {
    addIssue(issues, 'LEGALITY_DRIFT', 'minimumFan differs from the Rule Spec.');
  }

  const extras = new Map(rulePackage.scoring.extras?.map((extra) => [extra.extraId, extra]));
  const selfDraw = extras.get(contract.selfDrawExtraId);
  const flowers = extras.get(contract.flowerExtraId);
  if (
    rulePackage.scoring.strategyKey !== contract.scoringStrategyKey ||
    rulePackage.scoring.cap?.enabled !== spec.capEnabled ||
    rulePackage.scoring.cap?.value !== null ||
    selfDraw?.mode !== 'ADD' ||
    selfDraw.value !== spec.selfDrawFan ||
    flowers?.mode !== 'ADD' ||
    flowers.value !== spec.flowerFanPerTile
  ) {
    addIssue(issues, 'SCORING_DRIFT', 'Scoring, cap, self-draw, or flower facts drifted.');
  }
}

function compareSources(
  rulePackage: RulePackageDefinition,
  spec: RuleSpecSnapshot,
  issues: BuildTimeRuleValidationIssue[],
): void {
  const actualSourceIds = rulePackage.sources.map(({ sourceId }) => sourceId);
  if (JSON.stringify(actualSourceIds) !== JSON.stringify(spec.sourceIds)) {
    addIssue(issues, 'SOURCE_DRIFT', 'RuleSource IDs differ from the Rule Spec.');
  }
}

function hasForbiddenKey(input: unknown, forbiddenKeys: ReadonlySet<string>): boolean {
  if (input === null || typeof input !== 'object') {
    return false;
  }
  if (Array.isArray(input)) {
    return input.some((value) => hasForbiddenKey(value, forbiddenKeys));
  }
  return Object.entries(input).some(
    ([key, value]) => forbiddenKeys.has(key) || hasForbiddenKey(value, forbiddenKeys),
  );
}

export async function validateBuiltInRulePackage(
  input: BuildTimeRuleValidationInput,
): Promise<BuildTimeRuleValidationReport> {
  const issues: BuildTimeRuleValidationIssue[] = [];
  let spec: RuleSpecSnapshot;
  try {
    spec = parseRuleSpecSnapshot(input.ruleSpecMarkdown);
  } catch (error) {
    throw new BuildTimeRuleValidationError([
      {
        code: 'RULE_SPEC_INVALID',
        message: error instanceof Error ? error.message : 'Rule Spec could not be parsed.',
      },
    ]);
  }

  let rulePackage: RulePackageDefinition;
  try {
    rulePackage = await validateRulePackageInput(
      input.rulePackageInput,
      input.capabilityRegistry,
      input.patternRecognizerRegistry,
    );
  } catch (error) {
    const message =
      error instanceof RulePackageValidationError
        ? error.issues.map(({ code }) => code).join(', ')
        : error instanceof Error
          ? error.message
          : 'RulePackage could not be validated.';
    throw new BuildTimeRuleValidationError([{ code: 'RULE_PACKAGE_INVALID', message }]);
  }

  const corpusResult = ruleCorpusIndexSchema.safeParse(input.ruleCorpusInput);
  if (!corpusResult.success) {
    addIssue(issues, 'CORPUS_INVALID', corpusResult.error.message);
  }

  compareIdentity(rulePackage, spec, issues);
  comparePatterns(rulePackage, spec, issues);
  compareTileAndHandFacts(rulePackage, spec, issues);
  compareStructures(rulePackage, spec, input.contract, issues);
  compareScoring(rulePackage, spec, input.contract, issues);
  compareSources(rulePackage, spec, issues);

  if (corpusResult.success) {
    const corpus = corpusResult.data;
    if (corpus.ruleId !== spec.ruleId) {
      addIssue(issues, 'CORPUS_RULE_ID_DRIFT', 'Rule Corpus Rule ID differs from the Rule Spec.');
    }
    if (corpus.ruleVersion !== spec.ruleVersion) {
      addIssue(
        issues,
        'CORPUS_RULE_VERSION_DRIFT',
        'Rule Corpus Rule Version differs from the Rule Spec.',
      );
    }

    const patternIds = new Set(rulePackage.patterns.map(({ patternId }) => patternId));
    const caseIds = new Set(corpus.cases.map(({ caseId }) => caseId));
    const invalidCasePattern = corpus.cases.some(
      ({ patternId }) => patternId !== undefined && !patternIds.has(patternId),
    );
    const invalidExample = rulePackage.encyclopedia.examples.some(
      ({ ruleCaseId }) => !caseIds.has(ruleCaseId),
    );
    if (invalidCasePattern || invalidExample) {
      addIssue(
        issues,
        'RULE_CASE_REFERENCE_INVALID',
        'Rule Corpus or encyclopedia contains an unknown reference.',
      );
    }
  }

  if (hasForbiddenKey(rulePackage, new Set(input.contract.forbiddenPlatformKeys))) {
    addIssue(
      issues,
      'FORBIDDEN_PLATFORM_RULE',
      'RulePackage contains a platform-specific reward field.',
    );
  }

  if (issues.length > 0) {
    throw new BuildTimeRuleValidationError(issues);
  }

  const enabledPatternCount = rulePackage.patterns.filter(({ enabled }) => enabled).length;
  return Object.freeze({
    ruleId: rulePackage.manifest.ruleId,
    ruleVersion: rulePackage.manifest.ruleVersion,
    patternCount: rulePackage.patterns.length,
    enabledPatternCount,
    disabledPatternCount: rulePackage.patterns.length - enabledPatternCount,
    sourceCount: rulePackage.sources.length,
  });
}
