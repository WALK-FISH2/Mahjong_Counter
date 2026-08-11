import {
  canonicalizeRuleData,
  SHA256_CONTENT_HASH_PATTERN,
} from '../../domain/rules/content-integrity';
import type { RuleDataValue } from '../../domain/rules/rule-data';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
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
