import { RuleRepositoryError, type RuleRepository } from '../../application/rules/rule-repository';
import type { RuleRef } from '../../domain/mahjong/calculator-document';
import type { CapabilityRegistry } from '../../domain/rules/capability-registry';
import type { RuleManifest } from '../../domain/rules/rule-manifest';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import { RulePackageValidationError, validateRulePackageInput } from './validate-rule-package';

export type BuiltInRuleRegistration = Readonly<{
  ref: RuleRef;
  input: unknown;
  capabilities: CapabilityRegistry;
}>;

function refKey(ref: RuleRef): string {
  return `${ref.ruleId}@${ref.ruleVersion}`;
}

function mapValidationError(error: RulePackageValidationError): RuleRepositoryError {
  if (error.issues.some(({ code }) => code === 'CONTENT_HASH_MISMATCH')) {
    return new RuleRepositoryError('RULE_PACKAGE_INTEGRITY_MISMATCH');
  }
  if (error.issues.some(({ code }) => code === 'CAPABILITY_INVALID')) {
    return new RuleRepositoryError('RULE_CAPABILITY_UNAVAILABLE');
  }
  return new RuleRepositoryError('RULE_PACKAGE_INVALID');
}

export class BuiltInRuleRepository implements RuleRepository {
  readonly #registrations = new Map<string, BuiltInRuleRegistration>();
  readonly #loaded = new Map<string, Promise<RulePackageDefinition>>();

  constructor(registrations: readonly BuiltInRuleRegistration[]) {
    registrations.forEach((registration) => {
      const key = refKey(registration.ref);
      if (this.#registrations.has(key)) {
        throw new RuleRepositoryError('RULE_REGISTRATION_DUPLICATE', { ruleRef: key });
      }
      this.#registrations.set(key, registration);
    });
  }

  async getInstalledRule(ref: RuleRef): Promise<RulePackageDefinition> {
    const key = refKey(ref);
    const registration = this.#registrations.get(key);
    if (registration === undefined) {
      throw new RuleRepositoryError('RULE_NOT_INSTALLED', { ruleRef: key });
    }

    const existing = this.#loaded.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const loaded = validateRulePackageInput(registration.input, registration.capabilities)
      .then((rulePackage) => {
        if (
          rulePackage.manifest.ruleId !== registration.ref.ruleId ||
          rulePackage.manifest.ruleVersion !== registration.ref.ruleVersion
        ) {
          throw new RuleRepositoryError('RULE_PACKAGE_INVALID', {
            expectedRuleRef: key,
            actualRuleRef: refKey(rulePackage.manifest),
          });
        }
        return rulePackage;
      })
      .catch((error: unknown) => {
        this.#loaded.delete(key);
        if (error instanceof RulePackageValidationError) {
          throw mapValidationError(error);
        }
        throw error;
      });
    this.#loaded.set(key, loaded);
    return loaded;
  }

  async listInstalledRules(): Promise<readonly RuleManifest[]> {
    return Promise.all(
      [...this.#registrations.values()].map(async ({ ref }) => {
        const rulePackage = await this.getInstalledRule(ref);
        return rulePackage.manifest;
      }),
    );
  }

  async listAvailableRules(): Promise<readonly RuleManifest[]> {
    return this.listInstalledRules();
  }

  downloadRule(ref: RuleRef): Promise<void> {
    return Promise.reject(
      new RuleRepositoryError('RULE_REPOSITORY_READ_ONLY', { ruleRef: refKey(ref) }),
    );
  }

  removeRule(ref: RuleRef): Promise<void> {
    return Promise.reject(
      new RuleRepositoryError('RULE_REPOSITORY_READ_ONLY', { ruleRef: refKey(ref) }),
    );
  }
}
