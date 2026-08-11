import { describe, expect, it } from 'vitest';

import { createHandSnapshot } from './hand';
import {
  addTransientChowTile,
  cancelTransientInput,
  removeTransientChowTile,
  startChowInput,
  startConcealedKongInput,
  startFlowerInput,
  startOpenKongInput,
  startPungInput,
} from './meld-input-state';

describe('TransientInputSession', () => {
  it('models the first one or two chow selections without creating a formal meld', () => {
    const hand = createHandSnapshot();
    const started = startChowInput();
    const oneSelected = addTransientChowTile(started, 'm1');
    const twoSelected = addTransientChowTile(oneSelected, 'm2');

    expect(started.selected).toEqual([]);
    expect(oneSelected.selected).toEqual(['m1']);
    expect(twoSelected.selected).toEqual(['m1', 'm2']);
    expect(twoSelected).not.toHaveProperty('melds');
    expect(hand.melds).toEqual([]);
    expect(() => addTransientChowTile(twoSelected, 'm3')).toThrow(RangeError);
  });

  it('supports withdrawing either selected chow tile', () => {
    const selected = addTransientChowTile(addTransientChowTile(startChowInput(), 'p1'), 'p2');

    expect(removeTransientChowTile(selected, 0).selected).toEqual(['p2']);
    expect(removeTransientChowTile(selected, 1).selected).toEqual(['p1']);
    expect(() => removeTransientChowTile(selected, 2)).toThrow(RangeError);
  });

  it('represents every non-chow temporary input mode without formal hand data', () => {
    expect(startPungInput()).toEqual({ kind: 'pung' });
    expect(startOpenKongInput('direct')).toEqual({ kind: 'open-kong', openKind: 'direct' });
    expect(startOpenKongInput('added')).toEqual({ kind: 'open-kong', openKind: 'added' });
    expect(startOpenKongInput()).toEqual({ kind: 'open-kong' });
    expect(startConcealedKongInput()).toEqual({ kind: 'concealed-kong' });
    expect(startFlowerInput()).toEqual({ kind: 'flower' });
  });

  it('returns to the neutral state when transient input is cancelled', () => {
    expect(cancelTransientInput()).toEqual({ kind: 'none' });
  });
});
