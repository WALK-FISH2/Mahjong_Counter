import { z } from 'zod';

import type { RuleDataObject, RuleDataValue } from '../../domain/rules/rule-data';

const MAX_RULE_DATA_DEPTH = 8;
const MAX_RULE_DATA_ARRAY_LENGTH = 256;
const MAX_RULE_DATA_OBJECT_KEYS = 128;

const forbiddenParameterKeys = new Set([
  'code',
  'constructor',
  'endpoint',
  'eval',
  'expression',
  'function',
  'functionbody',
  'importurl',
  'module',
  'moduleurl',
  'networkrequest',
  'proto',
  'prototype',
  'requesturl',
  'script',
  'scripturl',
]);

const ruleDataKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .refine(
    (key) => !forbiddenParameterKeys.has(key.replace(/[^a-z0-9]/giu, '').toLowerCase()),
    'Executable or prototype-sensitive parameter keys are not allowed',
  );

const ruleDataPrimitiveSchema = z.union([
  z.boolean(),
  z.number().finite().safe(),
  z.string().max(4096),
  z.null(),
]);

function createRuleDataValueSchema(depth: number): z.ZodType<RuleDataValue> {
  if (depth >= MAX_RULE_DATA_DEPTH) {
    return ruleDataPrimitiveSchema;
  }

  const childSchema = createRuleDataValueSchema(depth + 1);
  const objectSchema = z.record(ruleDataKeySchema, childSchema).superRefine((value, context) => {
    if (Object.keys(value).length > MAX_RULE_DATA_OBJECT_KEYS) {
      context.addIssue({
        code: 'custom',
        message: `Rule data objects may contain at most ${MAX_RULE_DATA_OBJECT_KEYS} keys`,
      });
    }
  });

  return z.union([
    ruleDataPrimitiveSchema,
    z.array(childSchema).max(MAX_RULE_DATA_ARRAY_LENGTH),
    objectSchema,
  ]);
}

const nestedRuleDataValueSchema = createRuleDataValueSchema(1);

export const ruleDataObjectSchema = z
  .record(ruleDataKeySchema, nestedRuleDataValueSchema)
  .superRefine((value, context) => {
    if (Object.keys(value).length > MAX_RULE_DATA_OBJECT_KEYS) {
      context.addIssue({
        code: 'custom',
        message: `Rule data objects may contain at most ${MAX_RULE_DATA_OBJECT_KEYS} keys`,
      });
    }
  }) satisfies z.ZodType<RuleDataObject>;
