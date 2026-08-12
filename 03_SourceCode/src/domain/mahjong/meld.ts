import type { TileCode } from './tile';

export type ChowMeld = Readonly<{
  id: string;
  type: 'chow';
  tiles: readonly [TileCode, TileCode, TileCode];
}>;

export type PungMeld = Readonly<{
  id: string;
  type: 'pung';
  tile: TileCode;
}>;

export const OPEN_KONG_KINDS = ['direct', 'added'] as const;

export type OpenKongKind = (typeof OPEN_KONG_KINDS)[number];

export type OpenKongMeld = Readonly<{
  id: string;
  type: 'kong';
  tile: TileCode;
  exposure: 'open';
  openKind?: OpenKongKind;
}>;

export type ConcealedKongMeld = Readonly<{
  id: string;
  type: 'kong';
  tile: TileCode;
  exposure: 'concealed';
  openKind?: never;
}>;

export type KongMeld = OpenKongMeld | ConcealedKongMeld;
export type Meld = ChowMeld | PungMeld | KongMeld;

export function createChowMeld(
  id: string,
  tiles: readonly [TileCode, TileCode, TileCode],
): ChowMeld {
  const copiedTiles: readonly [TileCode, TileCode, TileCode] = Object.freeze([
    tiles[0],
    tiles[1],
    tiles[2],
  ]);

  return Object.freeze({
    id,
    type: 'chow',
    tiles: copiedTiles,
  });
}

export function createPungMeld(id: string, tile: TileCode): PungMeld {
  return Object.freeze({ id, type: 'pung', tile });
}

export function createOpenKongMeld(
  id: string,
  tile: TileCode,
  openKind?: OpenKongKind,
): OpenKongMeld {
  return Object.freeze(
    openKind === undefined
      ? { id, type: 'kong', tile, exposure: 'open' }
      : { id, type: 'kong', tile, exposure: 'open', openKind },
  );
}

export function createConcealedKongMeld(id: string, tile: TileCode): ConcealedKongMeld {
  return Object.freeze({ id, type: 'kong', tile, exposure: 'concealed' });
}
