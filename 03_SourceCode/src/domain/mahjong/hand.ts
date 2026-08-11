import type { Meld } from './meld';
import type { TileCode } from './tile';

export type HandSnapshot = Readonly<{
  concealed: readonly TileCode[];
  melds: readonly Meld[];
  flowers: readonly TileCode[];
  winningTile: TileCode | null;
}>;

export type HandSnapshotInput = Readonly<{
  concealed?: readonly TileCode[];
  melds?: readonly Meld[];
  flowers?: readonly TileCode[];
  winningTile?: TileCode | null;
}>;

export function createHandSnapshot(input: HandSnapshotInput = {}): HandSnapshot {
  return Object.freeze({
    concealed: Object.freeze([...(input.concealed ?? [])]),
    melds: Object.freeze([...(input.melds ?? [])]),
    flowers: Object.freeze([...(input.flowers ?? [])]),
    winningTile: input.winningTile ?? null,
  });
}

export const EMPTY_HAND_SNAPSHOT: HandSnapshot = createHandSnapshot();
