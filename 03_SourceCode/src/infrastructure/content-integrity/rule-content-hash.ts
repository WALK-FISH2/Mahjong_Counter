import {
  canonicalizeRuleData,
  SHA256_CONTENT_HASH_PATTERN,
} from '../../domain/rules/content-integrity';
import type { RuleDataValue } from '../../domain/rules/rule-data';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toRuleDataValue(input: unknown): RuleDataValue {
  if (
    input === null ||
    typeof input === 'boolean' ||
    typeof input === 'string' ||
    typeof input === 'number'
  ) {
    if (typeof input === 'number' && !Number.isFinite(input)) {
      throw new TypeError('Rule package content contains a non-finite number.');
    }
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => toRuleDataValue(item));
  }

  if (typeof input !== 'object') {
    throw new TypeError('Rule package content must contain JSON data only.');
  }

  const prototype = Object.getPrototypeOf(input) as object | null;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('Rule package content must use plain JSON objects.');
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, toRuleDataValue(value)]),
  );
}

export function createRulePackageContentPayload(rulePackage: RulePackageDefinition): RuleDataValue {
  const manifestWithoutHash = Object.fromEntries(
    Object.entries(rulePackage.manifest).filter(([key]) => key !== 'contentHash'),
  );

  return toRuleDataValue({
    ...rulePackage,
    manifest: manifestWithoutHash,
  });
}

export async function calculateRulePackageContentHash(
  rulePackage: RulePackageDefinition,
): Promise<string> {
  return calculateRuleContentHash(createRulePackageContentPayload(rulePackage));
}

export async function verifyRulePackageContentHash(
  rulePackage: RulePackageDefinition,
): Promise<boolean> {
  return verifyRuleContentHash(
    createRulePackageContentPayload(rulePackage),
    rulePackage.manifest.contentHash,
  );
}

export async function calculateRuleContentHash(payload: RuleDataValue): Promise<string> {
  const canonicalPayload = canonicalizeRuleData(payload);
  const bytes = new TextEncoder().encode(canonicalPayload);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return bytesToHex(new Uint8Array(digest));
}

export async function verifyRuleContentHash(
  payload: RuleDataValue,
  expectedHash: string,
): Promise<boolean> {
  if (!SHA256_CONTENT_HASH_PATTERN.test(expectedHash)) {
    return false;
  }

  return (await calculateRuleContentHash(payload)) === expectedHash;
}
