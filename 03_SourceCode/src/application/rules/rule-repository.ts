import type { RuleRef } from '../../domain/mahjong/calculator-document';
import type { RuleManifest } from '../../domain/rules/rule-manifest';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';

export type RuleRepositoryErrorCode =
  | 'RULE_NOT_INSTALLED'
  | 'RULE_REGISTRATION_DUPLICATE'
  | 'RULE_PACKAGE_INVALID'
  | 'RULE_PACKAGE_INTEGRITY_MISMATCH'
  | 'RULE_CAPABILITY_UNAVAILABLE'
  | 'RULE_REPOSITORY_READ_ONLY';

export class RuleRepositoryError extends Error {
  readonly reasonCode: RuleRepositoryErrorCode;
  readonly data: Readonly<Record<string, string>>;

  constructor(reasonCode: RuleRepositoryErrorCode, data: Readonly<Record<string, string>> = {}) {
    super(reasonCode);
    this.name = 'RuleRepositoryError';
    this.reasonCode = reasonCode;
    this.data = Object.freeze({ ...data });
  }
}

export interface RuleRepository {
  getInstalledRule(ref: RuleRef): Promise<RulePackageDefinition>;
  listInstalledRules(): Promise<readonly RuleManifest[]>;
  listAvailableRules(): Promise<readonly RuleManifest[]>;
  downloadRule(ref: RuleRef): Promise<void>;
  removeRule(ref: RuleRef): Promise<void>;
}
