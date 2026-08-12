import type { TileCode } from '../../domain/mahjong/tile';
import type { TileSetDefinition, TileSetGroupDefinition } from '../../domain/rules/tile-set';

const GROUP_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'tiles.characters': '万子',
  'tiles.dots': '筒子',
  'tiles.bamboos': '条子',
  'tiles.honors': '字牌',
  'tiles.flowers': '花牌',
});

export type PaletteGroup = Readonly<{
  id: string;
  label: string;
  tiles: readonly TileCode[];
}>;

function groupLabel(group: TileSetGroupDefinition): string {
  return GROUP_LABELS[group.labelKey] ?? group.labelKey;
}

export function getTilePaletteGroups(tileSet: TileSetDefinition): readonly PaletteGroup[] {
  const enabled = new Set(tileSet.enabledTiles);
  const grouped = new Set<TileCode>();
  const groups: PaletteGroup[] = [];

  for (const group of tileSet.groups) {
    const tiles = group.tiles.filter((tile) => enabled.has(tile) && !grouped.has(tile));

    if (tiles.length === 0) {
      continue;
    }

    tiles.forEach((tile) => grouped.add(tile));
    groups.push(Object.freeze({ id: group.id, label: groupLabel(group), tiles }));
  }

  const ungrouped = tileSet.enabledTiles.filter((tile) => !grouped.has(tile));

  if (ungrouped.length > 0) {
    groups.push(Object.freeze({ id: 'other', label: '其他', tiles: ungrouped }));
  }

  return Object.freeze(groups);
}
