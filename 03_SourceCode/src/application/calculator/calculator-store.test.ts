import { describe, expect, it } from 'vitest';

import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import {
  createCalculatorStore,
  createInitialCalculatorDocument,
  getDisplayedConcealedTiles,
} from './calculator-store';
import {
  createChowMeld,
  createHandSnapshot,
  createPungMeld,
  createWinContext,
  createCalculatorDocument,
} from '../../domain/mahjong';

describe('calculator input store', () => {
  it('adds and removes one repeated concealed tile while preserving the remaining input order', () => {
    const store = createCalculatorStore(commonSimpleRulePackage);

    expect(store.getState().addConcealedTile('m3')).toEqual({ accepted: true });
    expect(store.getState().addConcealedTile('m1')).toEqual({ accepted: true });
    expect(store.getState().addConcealedTile('m3')).toEqual({ accepted: true });
    expect(store.getState().document.hand.concealed).toEqual(['m3', 'm1', 'm3']);

    expect(store.getState().removeConcealedTile(0)).toBe(true);
    expect(store.getState().document.hand.concealed).toEqual(['m1', 'm3']);
    expect(store.getState().document.revision).toBe(4);
  });

  it('applies the RulePackage copy limit across concealed, melds, and winning tile', () => {
    const document = createCalculatorDocument({
      schemaVersion: 1,
      ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
      hand: createHandSnapshot({
        concealed: ['m1'],
        melds: [createPungMeld('pung-m1', 'm1')],
      }),
      context: createWinContext('discard'),
    });
    const store = createCalculatorStore(commonSimpleRulePackage, document);

    expect(store.getState().addConcealedTile('m1')).toEqual({
      accepted: false,
      reasonCode: 'TILE_COPY_LIMIT_REACHED',
    });

    const winningTileDocument = createCalculatorDocument({
      ...document,
      hand: createHandSnapshot({
        concealed: ['p2'],
        melds: [createChowMeld('chow-p', ['p1', 'p2', 'p3'])],
        winningTile: 'p2',
      }),
    });
    const winningTileStore = createCalculatorStore(commonSimpleRulePackage, winningTileDocument);

    expect(winningTileStore.getState().addConcealedTile('p2')).toEqual({ accepted: true });
    expect(winningTileStore.getState().addConcealedTile('p2')).toEqual({
      accepted: false,
      reasonCode: 'TILE_COPY_LIMIT_REACHED',
    });
  });

  it('rejects disabled tiles and leaves flowers to their later dedicated input flow', () => {
    const limitedRule = {
      ...commonSimpleRulePackage,
      tileSet: {
        ...commonSimpleRulePackage.tileSet,
        enabledTiles: commonSimpleRulePackage.tileSet.enabledTiles.filter(
          (tile) => tile !== 'east',
        ),
      },
    };
    const store = createCalculatorStore(limitedRule);
    const initialDocument = store.getState().document;

    expect(store.getState().addConcealedTile('east')).toEqual({
      accepted: false,
      reasonCode: 'TILE_NOT_ENABLED',
    });
    expect(store.getState().document).toBe(initialDocument);

    expect(store.getState().addConcealedTile('spring')).toEqual({
      accepted: false,
      reasonCode: 'TILE_NOT_CONCEALED',
    });
    expect(store.getState().document.hand.concealed).toEqual([]);
    expect(store.getState().document.hand.flowers).toEqual([]);
    expect(store.getState().document).toBe(initialDocument);
  });

  it('arranges only the displayed tiles and leaves the HandSnapshot order untouched', () => {
    const document = createInitialCalculatorDocument(commonSimpleRulePackage);
    const store = createCalculatorStore(commonSimpleRulePackage, document);

    store.getState().addConcealedTile('p9');
    store.getState().addConcealedTile('m2');
    store.getState().addConcealedTile('p1');
    const originalHand = store.getState().document.hand;

    store.getState().arrangeConcealedTiles();

    const current = store.getState();
    expect(current.document.hand).toBe(originalHand);
    expect(current.document.hand.concealed).toEqual(['p9', 'm2', 'p1']);
    expect(getDisplayedConcealedTiles(current.document, current.concealedSortMode)).toEqual([
      { tile: 'm2', originalIndex: 1 },
      { tile: 'p1', originalIndex: 2 },
      { tile: 'p9', originalIndex: 0 },
    ]);
  });
});
