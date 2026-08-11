import {
  evaluateRuleCalculationReadiness,
  type CapabilityRegistry,
} from '../../domain/rules/capability-registry';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import { patternCatalogWithSourcesSchema } from '../../schemas/rule-package/pattern-catalog-schema';
import { patternRelationsWithPatternsSchema } from '../../schemas/rule-package/pattern-relation-schema';
import { rulePackageDefinitionSchema } from '../../schemas/rule-package/rule-package-definition-schema';
import { verifyRulePackageContentHash } from '../content-integrity/rule-content-hash';

export type RulePackageValidationIssueCode =
  | 'SCHEMA_INVALID'
  | 'SOURCE_REFERENCE_INVALID'
  | 'RELATION_INVALID'
  | 'CAPABILITY_INVALID'
  | 'TEMPORARY_ADJUSTMENT_REFERENCE_INVALID'
  | 'ENCYCLOPEDIA_VERSION_DRIFT'
  | 'ENCYCLOPEDIA_REFERENCE_INVALID'
  | 'CONTENT_HASH_MISMATCH';

export type RulePackageValidationIssue = Readonly<{
  code: RulePackageValidationIssueCode;
  message: string;
}>;

export class RulePackageValidationError extends Error {
  readonly issues: readonly RulePackageValidationIssue[];

  constructor(issues: readonly RulePackageValidationIssue[]) {
    super(issues.map(({ code }) => code).join(', '));
    this.name = 'RulePackageValidationError';
    this.issues = Object.freeze([...issues]);
  }
}

function freezeRecursively(value: unknown): void {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return;
  }

  Object.values(value).forEach((nestedValue) => {
    freezeRecursively(nestedValue);
  });
  Object.freeze(value);
}

function validateTemporaryAdjustmentReferences(
  rulePackage: RulePackageDefinition,
): RulePackageValidationIssue[] {
  const patternIds = new Set(rulePackage.patterns.map(({ patternId }) => patternId));
  const extraIds = new Set(rulePackage.scoring.extras?.map(({ extraId }) => extraId) ?? []);
  const issues: RulePackageValidationIssue[] = [];

  rulePackage.temporaryAdjustments.forEach(({ adjustmentId, target }) => {
    if (target.module === 'pattern' && !patternIds.has(target.patternId)) {
      issues.push({
        code: 'TEMPORARY_ADJUSTMENT_REFERENCE_INVALID',
        message: `${adjustmentId} references unknown pattern ${target.patternId}`,
      });
    }

    if (target.module === 'scoring-extra' && !extraIds.has(target.extraId)) {
      issues.push({
        code: 'TEMPORARY_ADJUSTMENT_REFERENCE_INVALID',
        message: `${adjustmentId} references unknown scoring extra ${target.extraId}`,
      });
    }

    if (target.module === 'scoring-cap' && rulePackage.scoring.cap === undefined) {
      issues.push({
        code: 'TEMPORARY_ADJUSTMENT_REFERENCE_INVALID',
        message: `${adjustmentId} references a cap that is not declared`,
      });
    }
  });

  return issues;
}

function validateEncyclopediaReferences(
  rulePackage: RulePackageDefinition,
): RulePackageValidationIssue[] {
  const issues: RulePackageValidationIssue[] = [];
  const patternIds = new Set(rulePackage.patterns.map(({ patternId }) => patternId));
  const sourceIds = new Set(rulePackage.sources.map(({ sourceId }) => sourceId));

  if (
    rulePackage.encyclopedia.ruleId !== rulePackage.manifest.ruleId ||
    rulePackage.encyclopedia.ruleVersion !== rulePackage.manifest.ruleVersion
  ) {
    issues.push({
      code: 'ENCYCLOPEDIA_VERSION_DRIFT',
      message: 'Encyclopedia rule identity must match the RuleManifest',
    });
  }

  rulePackage.encyclopedia.patternArticles.forEach(({ patternId }) => {
    if (!patternIds.has(patternId)) {
      issues.push({
        code: 'ENCYCLOPEDIA_REFERENCE_INVALID',
        message: `Encyclopedia references unknown pattern ${patternId}`,
      });
    }
  });

  rulePackage.encyclopedia.sourceArticles.forEach(({ sourceId }) => {
    if (!sourceIds.has(sourceId)) {
      issues.push({
        code: 'ENCYCLOPEDIA_REFERENCE_INVALID',
        message: `Encyclopedia references unknown source ${sourceId}`,
      });
    }
  });

  return issues;
}

export async function validateRulePackageInput(
  input: unknown,
  capabilities: CapabilityRegistry,
): Promise<RulePackageDefinition> {
  const parsed = rulePackageDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    throw new RulePackageValidationError([
      { code: 'SCHEMA_INVALID', message: parsed.error.message },
    ]);
  }

  const rulePackage = parsed.data;
  const issues: RulePackageValidationIssue[] = [];
  const sourceResult = patternCatalogWithSourcesSchema.safeParse({
    patterns: rulePackage.patterns,
    sources: rulePackage.sources,
  });
  if (!sourceResult.success) {
    issues.push({ code: 'SOURCE_REFERENCE_INVALID', message: sourceResult.error.message });
  }

  const relationResult = patternRelationsWithPatternsSchema.safeParse({
    patterns: rulePackage.patterns,
    relations: rulePackage.relations,
  });
  if (!relationResult.success) {
    issues.push({ code: 'RELATION_INVALID', message: relationResult.error.message });
  }

  const readiness = evaluateRuleCalculationReadiness(
    capabilities,
    rulePackage.manifest,
    rulePackage.patterns,
    rulePackage.structures,
    rulePackage.scoring,
  );
  if (!readiness.canCalculate) {
    issues.push({
      code: 'CAPABILITY_INVALID',
      message: readiness.blocks.map(({ reasonCode }) => reasonCode).join(', '),
    });
  }

  issues.push(...validateTemporaryAdjustmentReferences(rulePackage));
  issues.push(...validateEncyclopediaReferences(rulePackage));

  if (!(await verifyRulePackageContentHash(rulePackage))) {
    issues.push({
      code: 'CONTENT_HASH_MISMATCH',
      message: 'RulePackage content does not match manifest.contentHash',
    });
  }

  if (issues.length > 0) {
    throw new RulePackageValidationError(issues);
  }

  freezeRecursively(rulePackage);
  return rulePackage;
}
