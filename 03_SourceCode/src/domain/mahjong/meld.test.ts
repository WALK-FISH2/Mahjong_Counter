import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  createChowMeld,
  createConcealedKongMeld,
  createOpenKongMeld,
  createPungMeld,
  type ConcealedKongMeld,
  type Meld,
  type OpenKongMeld,
} from './meld';
import type { TileCode } from './tile';

describe('Meld model', () => {
  it('constructs distinct chow, pung, open kong, and concealed kong shapes', () => {
    const chow = createChowMeld('chow-1', ['m1', 'm2', 'm3']);
    const pung = createPungMeld('pung-1', 'east');
    const directKong = createOpenKongMeld('kong-1', 'p5', 'direct');
    const addedKong = createOpenKongMeld('kong-2', 's8', 'added');
    const unspecifiedOpenKong = createOpenKongMeld('kong-3', 'red');
    const concealedKong = createConcealedKongMeld('kong-4', 'white');

    expect(chow).toEqual({ id: 'chow-1', type: 'chow', tiles: ['m1', 'm2', 'm3'] });
    expect(pung).toEqual({ id: 'pung-1', type: 'pung', tile: 'east' });
    expect(directKong).toMatchObject({ exposure: 'open', openKind: 'direct' });
    expect(addedKong).toMatchObject({ exposure: 'open', openKind: 'added' });
    expect(unspecifiedOpenKong).toEqual({
      id: 'kong-3',
      type: 'kong',
      tile: 'red',
      exposure: 'open',
    });
    expect(concealedKong).toEqual({
      id: 'kong-4',
      type: 'kong',
      tile: 'white',
      exposure: 'concealed',
    });
  });

  it('copies the chow tuple at the construction boundary', () => {
    const selected: [TileCode, TileCode, TileCode] = ['p1', 'p2', 'p3'];
    const chow = createChowMeld('chow-copy', selected);

    selected[0] = 'p9';

    expect(chow.tiles).toEqual(['p1', 'p2', 'p3']);
  });

  it('keeps multiplayer source fields out of every meld', () => {
    const melds: Meld[] = [
      createChowMeld('chow', ['s1', 's2', 's3']),
      createPungMeld('pung', 'south'),
      createOpenKongMeld('open-kong', 'm9', 'direct'),
      createConcealedKongMeld('concealed-kong', 'green'),
    ];

    for (const meld of melds) {
      expect(meld).not.toHaveProperty('sourcePlayer');
      expect(meld).not.toHaveProperty('fromPlayer');
    }
  });

  it('keeps open and concealed kong constraints distinct at the type boundary', () => {
    expectTypeOf<OpenKongMeld['exposure']>().toEqualTypeOf<'open'>();
    expectTypeOf<ConcealedKongMeld['exposure']>().toEqualTypeOf<'concealed'>();
    expectTypeOf<NonNullable<OpenKongMeld['openKind']>>().toEqualTypeOf<'direct' | 'added'>();
    expectTypeOf<ConcealedKongMeld['openKind']>().toEqualTypeOf<undefined>();
  });
});
