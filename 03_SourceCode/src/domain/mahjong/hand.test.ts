import { describe, expect, expectTypeOf, it } from 'vitest';

import { createHandSnapshot, type HandSnapshot } from './hand';
import { createPungMeld } from './meld';
import type { TileCode } from './tile';

describe('HandSnapshot', () => {
  it('keeps concealed tiles, melds, flowers, and winning tile in separate fields', () => {
    const snapshot = createHandSnapshot({
      concealed: ['m1', 'm2', 'm3'],
      melds: [createPungMeld('pung-east', 'east')],
      flowers: ['spring'],
      winningTile: 'm4',
    });

    expect(snapshot).toEqual({
      concealed: ['m1', 'm2', 'm3'],
      melds: [{ id: 'pung-east', type: 'pung', tile: 'east' }],
      flowers: ['spring'],
      winningTile: 'm4',
    });
    expect(snapshot.concealed).not.toContain('east');
    expect(snapshot.concealed).not.toContain('spring');
  });

  it('preserves the original concealed input order', () => {
    const snapshot = createHandSnapshot({ concealed: ['p9', 'm1', 'p1', 'm1'] });

    expect(snapshot.concealed).toEqual(['p9', 'm1', 'p1', 'm1']);
  });

  it('copies collection inputs so later caller mutations cannot alter the snapshot', () => {
    const concealed: TileCode[] = ['m1'];
    const flowers: TileCode[] = ['plum'];
    const snapshot = createHandSnapshot({ concealed, flowers });

    concealed.push('m2');
    flowers.push('orchid');

    expect(snapshot.concealed).toEqual(['m1']);
    expect(snapshot.flowers).toEqual(['plum']);
  });

  it('roundtrips through plain JSON without flattening the model', () => {
    const snapshot = createHandSnapshot({
      concealed: ['s1', 's2'],
      melds: [createPungMeld('pung-red', 'red')],
      flowers: ['summer', 'bamboo'],
      winningTile: 's3',
    });

    const roundtripped: unknown = JSON.parse(JSON.stringify(snapshot));

    expect(roundtripped).toEqual(snapshot);
    expectTypeOf<HandSnapshot['winningTile']>().toEqualTypeOf<TileCode | null>();
  });
});
