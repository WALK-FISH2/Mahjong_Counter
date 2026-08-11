import { z } from 'zod';

import { TILE_CODES, type TileCode } from '../../domain/mahjong/tile';
import type { TileSetDefinition } from '../../domain/rules/tile-set';

export const tileCodeSchema = z.enum(TILE_CODES);

const tileArraySchema = z.array(tileCodeSchema).max(TILE_CODES.length);

const tileSetGroupSchema = z.strictObject({
  id: z.string().trim().min(1).max(128),
  labelKey: z.string().trim().min(1).max(256),
  tiles: tileArraySchema.min(1).superRefine((tiles, context) => {
    addDuplicateTileIssues(tiles, context);
  }),
});

function addDuplicateTileIssues(tiles: readonly TileCode[], context: z.RefinementCtx): void {
  const seen = new Set<TileCode>();

  tiles.forEach((tile, index) => {
    if (seen.has(tile)) {
      context.addIssue({ code: 'custom', message: 'tile codes must be unique', path: [index] });
    }
    seen.add(tile);
  });
}

export const tileSetDefinitionSchema = z
  .strictObject({
    enabledTiles: tileArraySchema.min(1).superRefine((tiles, context) => {
      addDuplicateTileIssues(tiles, context);
    }),
    maxCopies: z.partialRecord(tileCodeSchema, z.number().int().positive().safe()),
    groups: z.array(tileSetGroupSchema).max(TILE_CODES.length),
  })
  .superRefine((tileSet, context) => {
    const enabledTiles = new Set<TileCode>(tileSet.enabledTiles);
    const groupIds = new Set<string>();

    tileSet.groups.forEach((group, groupIndex) => {
      if (groupIds.has(group.id)) {
        context.addIssue({
          code: 'custom',
          message: 'tile group IDs must be unique',
          path: ['groups', groupIndex, 'id'],
        });
      }
      groupIds.add(group.id);

      group.tiles.forEach((tile, tileIndex) => {
        if (!enabledTiles.has(tile)) {
          context.addIssue({
            code: 'custom',
            message: 'tile groups may only reference enabled tiles',
            path: ['groups', groupIndex, 'tiles', tileIndex],
          });
        }
      });
    });
  }) satisfies z.ZodType<TileSetDefinition>;

export function parseTileSetDefinition(input: unknown): TileSetDefinition {
  return tileSetDefinitionSchema.parse(input);
}
