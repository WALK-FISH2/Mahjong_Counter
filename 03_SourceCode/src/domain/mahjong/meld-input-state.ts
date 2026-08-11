import type { OpenKongKind } from './meld';
import type { TileCode } from './tile';

export type TransientChowSelection =
  readonly [] | readonly [TileCode] | readonly [TileCode, TileCode];

export type ChowInputSession = Readonly<{
  kind: 'chow';
  selected: TransientChowSelection;
}>;

export type TransientInputSession =
  | Readonly<{ kind: 'none' }>
  | ChowInputSession
  | Readonly<{ kind: 'pung' }>
  | Readonly<{ kind: 'open-kong'; openKind?: OpenKongKind }>
  | Readonly<{ kind: 'concealed-kong' }>
  | Readonly<{ kind: 'flower' }>;

export const NO_TRANSIENT_INPUT: TransientInputSession = Object.freeze({ kind: 'none' });

export function startChowInput(): ChowInputSession {
  const selected: readonly [] = Object.freeze([]);
  return Object.freeze({ kind: 'chow', selected });
}

export function startPungInput(): TransientInputSession {
  return Object.freeze({ kind: 'pung' });
}

export function startOpenKongInput(openKind?: OpenKongKind): TransientInputSession {
  return Object.freeze(
    openKind === undefined ? { kind: 'open-kong' } : { kind: 'open-kong', openKind },
  );
}

export function startConcealedKongInput(): TransientInputSession {
  return Object.freeze({ kind: 'concealed-kong' });
}

export function startFlowerInput(): TransientInputSession {
  return Object.freeze({ kind: 'flower' });
}

export function addTransientChowTile(session: ChowInputSession, tile: TileCode): ChowInputSession {
  if (session.selected.length >= 2) {
    throw new RangeError('An incomplete chow session can contain at most two selected tiles.');
  }

  return Object.freeze({
    kind: 'chow',
    selected: Object.freeze([...session.selected, tile]) as TransientChowSelection,
  });
}

export function removeTransientChowTile(
  session: ChowInputSession,
  selectedIndex: number,
): ChowInputSession {
  if (
    !Number.isInteger(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex >= session.selected.length
  ) {
    throw new RangeError('The transient chow tile index is out of range.');
  }

  return Object.freeze({
    kind: 'chow',
    selected: Object.freeze(
      session.selected.filter((_, index) => index !== selectedIndex),
    ) as TransientChowSelection,
  });
}

export function cancelTransientInput(): TransientInputSession {
  return NO_TRANSIENT_INPUT;
}
