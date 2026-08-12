import { describe, expect, it } from 'vitest';

import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import {
  createCalculatorDocument,
  createHandSnapshot,
  createOpenKongMeld,
  createPungMeld,
  createWinContext,
  countHandStructure,
  type TileCode,
} from '../../domain/mahjong';
import {
  createCalculatorStore,
  getAddedKongUpgradeTile,
  getInputLimitTileCounts,
  getWinningTileConfirmation,
} from './calculator-store';

function documentWithConcealed(concealed: readonly TileCode[]) {
  return createCalculatorDocument({
    schemaVersion: 1,
    ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
    hand: createHandSnapshot({ concealed }),
    context: createWinContext('discard'),
  });
}

describe('calculator store Batch 12 input actions', () => {
  it('sets, replaces, removes, and undoes the independent winning tile with global limits', () => {
    const store = createCalculatorStore(
      commonSimpleRulePackage,
      documentWithConcealed(['m1', 'm1', 'm1', 'm1', 'p2']),
    );

    expect(store.getState().setWinningTile('m1')).toEqual({
      accepted: false,
      reasonCode: 'TILE_COPY_LIMIT_REACHED',
    });
    expect(store.getState().document.hand.winningTile).toBeNull();

    expect(store.getState().setWinningTile('p2')).toEqual({ accepted: true });
    expect(store.getState().setWinningTile('s3')).toEqual({ accepted: true });
    expect(store.getState().document.hand.winningTile).toBe('s3');
    expect(store.getState().undoLastHandChange()).toBe(true);
    expect(store.getState().document.hand.winningTile).toBe('p2');
    expect(store.getState().removeWinningTile()).toBe(true);
    expect(store.getState().document.hand.winningTile).toBeNull();
  });

  it('recommends but never assumes the last tile of a complete winning concealed hand', () => {
    const store = createCalculatorStore(
      commonSimpleRulePackage,
      documentWithConcealed([
        'm1',
        'm2',
        'm3',
        'p1',
        'p2',
        'p3',
        's1',
        's2',
        's3',
        'east',
        'east',
        'east',
        'white',
        'white',
      ]),
    );

    expect(getWinningTileConfirmation(store.getState().document, commonSimpleRulePackage)).toEqual({
      recommendedOriginalIndex: 13,
    });
    expect(store.getState().document.hand.winningTile).toBeNull();

    expect(store.getState().confirmWinningTileFromConcealed(13)).toEqual({ accepted: true });
    expect(store.getState().document.hand.concealed).toHaveLength(13);
    expect(store.getState().document.hand.winningTile).toBe('white');
  });

  it('keeps chow selections transient, rejects an invalid third tile, and commits only a legal chow', () => {
    const store = createCalculatorStore(commonSimpleRulePackage);
    const initialHand = store.getState().document.hand;

    expect(store.getState().beginTransientInput('chow')).toEqual({ accepted: true });
    expect(store.getState().selectTransientTile('m1')).toEqual({
      accepted: true,
      completed: false,
    });
    expect(store.getState().selectTransientTile('m2')).toEqual({
      accepted: true,
      completed: false,
    });
    expect(store.getState().document.hand).toEqual(initialHand);
    expect(store.getState().document.hand.melds).toEqual([]);
    expect(countHandStructure(store.getState().document.hand).structuralTileCount).toBe(0);
    expect(store.getState().document.transientInput).toEqual({
      kind: 'chow',
      selected: ['m1', 'm2'],
    });
    expect(getInputLimitTileCounts(store.getState().document, null)).toMatchObject({
      m1: 1,
      m2: 1,
    });
    expect(store.getState().document.hand.concealed).toEqual([]);

    expect(store.getState().selectTransientTile('p3')).toEqual({
      accepted: false,
      reasonCode: 'INVALID_CHOW',
    });
    expect(store.getState().document.transientInput).toEqual({
      kind: 'chow',
      selected: ['m1', 'm2'],
    });
    expect(store.getState().removeTransientChowTile(1)).toBe(true);
    expect(store.getState().selectTransientTile('m2')).toEqual({
      accepted: true,
      completed: false,
    });
    expect(store.getState().selectTransientTile('m3')).toEqual({ accepted: true, completed: true });
    expect(store.getState().document.hand.melds).toEqual([
      { id: 'meld-1', type: 'chow', tiles: ['m1', 'm2', 'm3'] },
    ]);
    expect(store.getState().document.transientInput).toEqual({ kind: 'none' });
  });

  it('cancels an incomplete chow without changing the formal hand', () => {
    const store = createCalculatorStore(commonSimpleRulePackage);
    const initialHand = store.getState().document.hand;

    store.getState().beginTransientInput('chow');
    store.getState().selectTransientTile('s4');
    expect(store.getState().cancelTransientInput()).toBe(true);

    expect(store.getState().document.hand).toEqual(initialHand);
    expect(store.getState().document.transientInput).toEqual({ kind: 'none' });
  });

  it('commits pung, direct open kong, and concealed kong as complete groups and resets input', () => {
    const store = createCalculatorStore(commonSimpleRulePackage);

    store.getState().beginTransientInput('pung');
    expect(store.getState().selectTransientTile('red')).toEqual({
      accepted: true,
      completed: true,
    });
    store.getState().beginTransientInput('open-kong', 'direct');
    expect(store.getState().selectTransientTile('m8')).toEqual({ accepted: true, completed: true });
    store.getState().beginTransientInput('concealed-kong');
    expect(store.getState().selectTransientTile('p5')).toEqual({ accepted: true, completed: true });

    expect(store.getState().document.hand.melds).toEqual([
      { id: 'meld-1', type: 'pung', tile: 'red' },
      { id: 'meld-2', type: 'kong', tile: 'm8', exposure: 'open', openKind: 'direct' },
      { id: 'meld-3', type: 'kong', tile: 'p5', exposure: 'concealed' },
    ]);
    expect(store.getState().document.transientInput).toEqual({ kind: 'none' });
  });

  it('uses the policy-driven added-kong flow to upgrade only the matching pung', () => {
    const document = createCalculatorDocument({
      schemaVersion: 1,
      ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
      hand: createHandSnapshot({ melds: [createPungMeld('pung-red', 'red')] }),
      context: createWinContext('discard'),
    });
    const store = createCalculatorStore(commonSimpleRulePackage, document);

    expect(store.getState().beginAddedKongUpgrade('pung-red')).toEqual({ accepted: true });
    expect(getAddedKongUpgradeTile(store.getState().document, 'pung-red')).toBe('red');
    expect(store.getState().selectTransientTile('green')).toEqual({
      accepted: false,
      reasonCode: 'ADDED_KONG_TILE_MISMATCH',
    });
    expect(store.getState().selectTransientTile('red')).toEqual({
      accepted: true,
      completed: true,
    });
    expect(store.getState().document.hand.melds).toEqual([
      { id: 'pung-red', type: 'kong', tile: 'red', exposure: 'open', openKind: 'added' },
    ]);
  });

  it('records a concrete flower only for flower-enabled rules and keeps it outside melds', () => {
    const store = createCalculatorStore(commonSimpleRulePackage);
    store.getState().beginTransientInput('flower');
    expect(store.getState().selectTransientTile('spring')).toEqual({
      accepted: true,
      completed: true,
    });
    expect(store.getState().document.hand.flowers).toEqual(['spring']);
    expect(store.getState().document.hand.melds).toEqual([]);

    const noFlowersRule = {
      ...commonSimpleRulePackage,
      handModel: { ...commonSimpleRulePackage.handModel, flowerPolicy: 'none' as const },
    };
    const noFlowersStore = createCalculatorStore(noFlowersRule);
    expect(noFlowersStore.getState().beginTransientInput('flower')).toEqual({
      accepted: false,
      reasonCode: 'FLOWERS_NOT_SUPPORTED',
    });
  });

  it('edits and deletes only whole melds and can undo both changes', () => {
    const document = createCalculatorDocument({
      schemaVersion: 1,
      ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
      hand: createHandSnapshot({ melds: [createPungMeld('pung-east', 'east')] }),
      context: createWinContext('discard'),
    });
    const store = createCalculatorStore(commonSimpleRulePackage, document);

    expect(store.getState().beginMeldEdit('pung-east')).toEqual({ accepted: true });
    expect(store.getState().document.hand.melds).toEqual([createPungMeld('pung-east', 'east')]);
    expect(store.getState().selectTransientTile('south')).toEqual({
      accepted: true,
      completed: true,
    });
    expect(store.getState().document.hand.melds).toEqual([createPungMeld('pung-east', 'south')]);
    expect(store.getState().undoLastHandChange()).toBe(true);
    expect(store.getState().document.hand.melds).toEqual([createPungMeld('pung-east', 'east')]);

    expect(store.getState().removeMeld('pung-east')).toBe(true);
    expect(store.getState().document.hand.melds).toEqual([]);
    expect(store.getState().undoLastHandChange()).toBe(true);
    expect(store.getState().document.hand.melds).toEqual([createPungMeld('pung-east', 'east')]);
  });

  it('edits an existing added kong as a whole group without treating it as a pung upgrade', () => {
    const document = createCalculatorDocument({
      schemaVersion: 1,
      ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
      hand: createHandSnapshot({
        melds: [createOpenKongMeld('added-red', 'red', 'added')],
      }),
      context: createWinContext('discard'),
    });
    const store = createCalculatorStore(commonSimpleRulePackage, document);

    expect(store.getState().beginMeldEdit('added-red')).toEqual({ accepted: true });
    expect(store.getState().selectTransientTile('green')).toEqual({
      accepted: true,
      completed: true,
    });
    expect(store.getState().document.hand.melds).toEqual([
      createOpenKongMeld('added-red', 'green', 'added'),
    ]);
  });
});
