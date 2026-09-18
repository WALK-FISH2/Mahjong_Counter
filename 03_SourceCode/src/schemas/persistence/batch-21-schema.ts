import { z } from 'zod';
import type {
  DraftRecord,
  RuleSnapshotRecord,
  TrashExampleRecord,
} from '../../application/persistence/persistence-models';
import { assertPersistenceInput, savedExampleSchema } from './saved-example-schema';
import { calculatorStateSchema, idSchema, ruleRefSchema } from './calculator-state-schema';
import { rulePackageDefinitionSchema } from '../rule-package/rule-package-definition-schema';
import { patternCatalogWithSourcesSchema } from '../rule-package/pattern-catalog-schema';
import { patternRelationsWithPatternsSchema } from '../rule-package/pattern-relation-schema';

export const trashExampleSchema = z
  .strictObject({
    ...savedExampleSchema.shape,
    trashedAt: z.iso.datetime(),
  })
  .superRefine((value, ctx) => {
    const saved = Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'trashedAt'));
    if (!savedExampleSchema.safeParse(saved).success)
      ctx.addIssue({ code: 'custom', message: 'Invalid saved example' });
  });
export const draftRecordSchema = z
  .strictObject({
    key: z.literal('current'),
    formatVersion: z.literal(1),
    savedAt: z.iso.datetime(),
    writeToken: idSchema,
    calculator: calculatorStateSchema,
    editingMeldId: idSchema.nullable(),
    editingOrigin: savedExampleSchema.nullable(),
    lease: z
      .strictObject({ owner: idSchema, token: idSchema, expiresAt: z.number().int().nonnegative() })
      .nullable(),
  })
  .superRefine((value, ctx) => {
    if (
      value.editingMeldId !== null &&
      (value.calculator.transientInput.kind === 'none' ||
        !value.calculator.hand.melds.some((m) => m.id === value.editingMeldId))
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid transient edit target' });
  });
const minimalRuleSchema = rulePackageDefinitionSchema
  .omit({ encyclopedia: true })
  .superRefine((value, ctx) => {
    if (
      !patternCatalogWithSourcesSchema.safeParse({
        patterns: value.patterns,
        sources: value.sources,
      }).success ||
      !patternRelationsWithPatternsSchema.safeParse({
        patterns: value.patterns,
        relations: value.relations,
      }).success
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid rule references' });
  });
export const ruleSnapshotSchema = z
  .strictObject({
    snapshotId: idSchema,
    formatVersion: z.literal(1),
    ruleRef: ruleRefSchema,
    contentHash: z.string().regex(/^[a-f0-9]{64}$/u),
    payload: minimalRuleSchema,
  })
  .superRefine((value, ctx) => {
    if (
      value.ruleRef.ruleId !== value.payload.manifest.ruleId ||
      value.ruleRef.ruleVersion !== value.payload.manifest.ruleVersion
    )
      ctx.addIssue({ code: 'custom', message: 'Rule snapshot identity mismatch' });
  });
export function parseDraftRecord(value: unknown): DraftRecord {
  assertPersistenceInput(value);
  return draftRecordSchema.parse(value);
}
export function parseTrashExample(value: unknown): TrashExampleRecord {
  assertPersistenceInput(value);
  return trashExampleSchema.parse(value);
}
export function parseRuleSnapshot(value: unknown): RuleSnapshotRecord {
  assertPersistenceInput(value);
  return ruleSnapshotSchema.parse(value);
}
