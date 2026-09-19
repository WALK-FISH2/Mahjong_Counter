import { z } from 'zod';
import { TILE_CODES } from '../../domain/mahjong/tile';
import type { Meld } from '../../domain/mahjong/meld';
import type { TransientInputSession } from '../../domain/mahjong/meld-input-state';
import type { FanAdjustment } from '../../domain/mahjong/calculator-document';
import type { PersistedCalculatorState } from '../../application/examples/persistence-models';
import { ruleDataObjectSchema } from '../rule-package/rule-data-schema';

export const idSchema = z.string().min(1).max(4096);
export const countSchema = z.number().int().nonnegative().safe();
export const tileSchema = z.enum(TILE_CODES);
export const ruleRefSchema = z.strictObject({ ruleId: idSchema, ruleVersion: idSchema });
const openKindSchema = z.enum(['direct', 'added']);
export const meldSchema = z.union([
  z.strictObject({
    id: idSchema,
    type: z.literal('chow'),
    tiles: z.tuple([tileSchema, tileSchema, tileSchema]),
  }),
  z.strictObject({ id: idSchema, type: z.literal('pung'), tile: tileSchema }),
  z.strictObject({
    id: idSchema,
    type: z.literal('kong'),
    tile: tileSchema,
    exposure: z.literal('concealed'),
  }),
  z
    .strictObject({
      id: idSchema,
      type: z.literal('kong'),
      tile: tileSchema,
      exposure: z.literal('open'),
      openKind: openKindSchema.optional(),
    })
    .transform(({ openKind, ...meld }): Meld => ({
      ...meld,
      ...(openKind === undefined ? {} : { openKind }),
    })),
]);
export const handSchema = z.strictObject({
  concealed: z.array(tileSchema),
  melds: z.array(meldSchema),
  flowers: z.array(tileSchema),
  winningTile: tileSchema.nullable(),
});
export const fanAdjustmentSchema = z.union([
  z.strictObject({ patternId: idSchema, action: z.literal('exclude') }),
  z
    .strictObject({
      patternId: idSchema,
      action: z.literal('force-include'),
      confirmedConflictSignature: idSchema.optional(),
    })
    .transform(({ confirmedConflictSignature, ...value }): FanAdjustment => ({
      ...value,
      ...(confirmedConflictSignature === undefined ? {} : { confirmedConflictSignature }),
    })),
]);
const transientSchema = z.union([
  z.strictObject({ kind: z.enum(['none', 'pung', 'concealed-kong', 'flower']) }),
  z.strictObject({
    kind: z.literal('chow'),
    selected: z.union([z.tuple([]), z.tuple([tileSchema]), z.tuple([tileSchema, tileSchema])]),
  }),
  z
    .strictObject({ kind: z.literal('open-kong'), openKind: openKindSchema.optional() })
    .transform(({ openKind, ...value }): TransientInputSession => ({
      ...value,
      ...(openKind === undefined ? {} : { openKind }),
    })),
]);
export const calculatorStateSchema = z.strictObject({
  schemaVersion: z.literal(1),
  ruleRef: ruleRefSchema,
  hand: handSchema,
  context: z.strictObject({
    mode: z.enum(['discard', 'self-draw']),
    values: z.record(
      idSchema,
      z.union([
        z.strictObject({ status: z.literal('unknown') }),
        z.strictObject({
          status: z.literal('known'),
          value: z.union([z.boolean(), z.number().finite(), z.string()]),
        }),
      ]),
    ),
  }),
  temporaryRuleAdjustment: z
    .strictObject({ baseRuleRef: ruleRefSchema, values: ruleDataObjectSchema })
    .nullable(),
  fanAdjustments: z.array(fanAdjustmentSchema),
  transientInput: transientSchema,
  source: z.union([
    z.strictObject({ kind: z.enum(['new', 'draft', 'shared', 'imported']) }),
    z.strictObject({
      kind: z.enum(['saved-example', 'encyclopedia-example']),
      exampleId: idSchema,
    }),
  ]),
  revision: countSchema,
}) satisfies z.ZodType<PersistedCalculatorState>;

export function parsePersistedCalculatorState(input: unknown): PersistedCalculatorState {
  return calculatorStateSchema.parse(input);
}
