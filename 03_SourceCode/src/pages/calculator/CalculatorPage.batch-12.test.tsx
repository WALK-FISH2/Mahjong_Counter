import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createCalculatorStore } from '../../application/calculator/calculator-store';
import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import {
  createCalculatorDocument,
  createHandSnapshot,
  createPungMeld,
  createWinContext,
} from '../../domain/mahjong';
import { CalculatorPage } from './CalculatorPage';

describe('CalculatorPage Batch 12 interaction', () => {
  it('guards switching from an incomplete chow and preserves temporary selections until abandoned', async () => {
    const user = userEvent.setup();
    const store = createCalculatorStore(commonSimpleRulePackage);
    render(<CalculatorPage store={store} />);
    const palette = screen.getByRole('heading', { name: '选牌器' }).closest('section')!;

    await user.click(screen.getByRole('button', { name: '吃' }));
    await user.click(within(palette).getByRole('button', { name: /一万，已使用 0 张/ }));
    await user.click(within(palette).getByRole('button', { name: /二万，已使用 0 张/ }));
    expect(store.getState().document.hand.melds).toEqual([]);

    await user.click(screen.getByRole('button', { name: '碰' }));
    const dialog = screen.getByRole('dialog', { name: '吃牌尚未完成' });
    expect(within(dialog).getByRole('button', { name: '继续完成吃牌' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: '放弃本次吃牌' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: '留在当前录入流程' })).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: '继续完成吃牌' }));
    expect(store.getState().document.transientInput).toEqual({
      kind: 'chow',
      selected: ['m1', 'm2'],
    });

    await user.click(screen.getByRole('button', { name: '碰' }));
    await user.click(screen.getByRole('button', { name: '留在当前录入流程' }));
    expect(store.getState().document.transientInput).toEqual({
      kind: 'chow',
      selected: ['m1', 'm2'],
    });

    await user.click(screen.getByRole('button', { name: '碰' }));
    await user.click(screen.getByRole('button', { name: '放弃本次吃牌' }));
    expect(store.getState().document.transientInput).toEqual({ kind: 'pung' });
    expect(store.getState().document.hand.melds).toEqual([]);
  });

  it('shows a winning-tile recommendation without assigning it and supports dismiss/confirm', async () => {
    const user = userEvent.setup();
    const document = createCalculatorDocument({
      schemaVersion: 1,
      ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
      hand: createHandSnapshot({
        concealed: [
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
        ],
      }),
      context: createWinContext('discard'),
    });
    const store = createCalculatorStore(commonSimpleRulePackage, document);
    render(<CalculatorPage store={store} />);

    expect(screen.getByRole('heading', { name: '请选择胡牌张' })).toBeVisible();
    expect(store.getState().document.hand.winningTile).toBeNull();
    await user.click(screen.getByRole('button', { name: '暂不确认' }));
    expect(screen.queryByRole('heading', { name: '请选择胡牌张' })).not.toBeInTheDocument();
    expect(store.getState().document.hand.winningTile).toBeNull();

    store.getState().removeConcealedTile(13);
    store.getState().addConcealedTile('white');
    const recommended = await screen.findByRole('button', { name: /确认为胡牌张白板，推荐/ });
    await user.click(recommended);
    expect(store.getState().document.hand.winningTile).toBe('white');
    expect(store.getState().document.hand.concealed).toHaveLength(13);
  });

  it('keeps invalid chow selections and shows a specific rejection before legal completion', async () => {
    const user = userEvent.setup();
    const store = createCalculatorStore(commonSimpleRulePackage);
    render(<CalculatorPage store={store} />);
    const palette = screen.getByRole('heading', { name: '选牌器' }).closest('section')!;

    await user.click(screen.getByRole('button', { name: '吃' }));
    await user.click(within(palette).getByRole('button', { name: /一万，已使用 0 张/ }));
    await user.click(within(palette).getByRole('button', { name: /二万，已使用 0 张/ }));
    await user.click(within(palette).getByRole('button', { name: /三筒，已使用 0 张/ }));

    expect(screen.getByRole('status')).toHaveTextContent('前两张已保留');
    expect(screen.getAllByRole('button', { name: /^撤回临时/ })).toHaveLength(2);
    expect(store.getState().document.hand.melds).toEqual([]);

    await user.click(within(palette).getByRole('button', { name: /三万，已使用 0 张/ }));
    expect(screen.queryByRole('heading', { name: '录入吃牌' })).not.toBeInTheDocument();
    const chowGroup = screen.getByLabelText('吃牌组');
    expect(within(chowGroup).getAllByText(/[🀇🀈🀉]/u)).toHaveLength(3);
    expect(store.getState().document.hand.melds).toHaveLength(1);
  });

  it('guards closing temporary chow input and operating the winning-tile slot', async () => {
    const user = userEvent.setup();
    const store = createCalculatorStore(commonSimpleRulePackage);
    render(<CalculatorPage store={store} />);
    const palette = screen.getByRole('heading', { name: '选牌器' }).closest('section')!;

    await user.click(screen.getByRole('button', { name: '吃' }));
    await user.click(within(palette).getByRole('button', { name: /四万，已使用 0 张/ }));
    await user.click(screen.getByRole('button', { name: '取消本次录入' }));
    expect(screen.getByRole('dialog', { name: '吃牌尚未完成' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '留在当前录入流程' }));
    expect(store.getState().document.transientInput).toEqual({ kind: 'chow', selected: ['m4'] });

    await user.click(screen.getByRole('button', { name: '选择胡牌张' }));
    expect(screen.getByRole('dialog', { name: '吃牌尚未完成' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '放弃本次吃牌' }));
    expect(store.getState().document.transientInput).toEqual({ kind: 'none' });
    expect(screen.getByText('请从选牌器选择一张胡牌张。')).toBeVisible();
    expect(store.getState().document.hand.melds).toEqual([]);
  });

  it('guards removing an existing winning tile while chow input is incomplete', async () => {
    const user = userEvent.setup();
    const document = createCalculatorDocument({
      schemaVersion: 1,
      ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
      hand: createHandSnapshot({ winningTile: 'east' }),
      context: createWinContext('discard'),
    });
    const store = createCalculatorStore(commonSimpleRulePackage, document);
    render(<CalculatorPage store={store} />);
    const palette = screen.getByRole('heading', { name: '选牌器' }).closest('section')!;

    await user.click(screen.getByRole('button', { name: '吃' }));
    await user.click(within(palette).getByRole('button', { name: /一筒，已使用 0 张/ }));
    await user.click(screen.getByRole('button', { name: '撤回胡牌张东风' }));
    expect(screen.getByRole('dialog', { name: '吃牌尚未完成' })).toBeVisible();
    expect(store.getState().document.hand.winningTile).toBe('east');

    await user.click(screen.getByRole('button', { name: '放弃本次吃牌' }));
    expect(store.getState().document.hand.winningTile).toBeNull();
    expect(store.getState().document.transientInput).toEqual({ kind: 'none' });
  });

  it('records pung, kongs, and flowers as visibly separated formal groups', async () => {
    const user = userEvent.setup();
    const store = createCalculatorStore(commonSimpleRulePackage);
    render(<CalculatorPage store={store} />);
    const palette = screen.getByRole('heading', { name: '选牌器' }).closest('section')!;

    await user.click(screen.getByRole('button', { name: '碰' }));
    await user.click(within(palette).getByRole('button', { name: /红中，已使用 0 张/ }));
    await user.click(screen.getByRole('button', { name: '明杠' }));
    await user.click(within(palette).getByRole('button', { name: /八万，已使用 0 张/ }));
    await user.click(screen.getByRole('button', { name: '暗杠' }));
    await user.click(within(palette).getByRole('button', { name: /五筒，已使用 0 张/ }));
    await user.click(screen.getByRole('button', { name: '花牌' }));
    await user.click(within(palette).getByRole('button', { name: /春，已使用 0 张/ }));

    const formalMelds = screen.getByLabelText('已完成副露');
    expect(within(formalMelds).getByText('碰')).toBeVisible();
    expect(within(formalMelds).getByText('明杠')).toBeVisible();
    expect(within(formalMelds).getByText('暗杠')).toBeVisible();
    expect(screen.getByLabelText('已录入花牌')).toBeVisible();
    expect(store.getState().document.hand.flowers).toEqual(['spring']);
    expect(store.getState().document.transientInput).toEqual({ kind: 'none' });
  });

  it('hides the flower entry when the current RulePackage does not support flowers', () => {
    const rulePackage = {
      ...commonSimpleRulePackage,
      handModel: { ...commonSimpleRulePackage.handModel, flowerPolicy: 'none' as const },
    };
    const store = createCalculatorStore(rulePackage);

    render(<CalculatorPage store={store} />);

    expect(screen.queryByRole('button', { name: '花牌' })).not.toBeInTheDocument();
  });

  it('edits, deletes, and undoes a whole meld without exposing single-tile deletion', async () => {
    const user = userEvent.setup();
    const document = createCalculatorDocument({
      schemaVersion: 1,
      ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
      hand: createHandSnapshot({ melds: [createPungMeld('pung-east', 'east')] }),
      context: createWinContext('discard'),
    });
    const store = createCalculatorStore(commonSimpleRulePackage, document);
    render(<CalculatorPage store={store} />);
    const palette = screen.getByRole('heading', { name: '选牌器' }).closest('section')!;

    expect(screen.queryByRole('button', { name: /撤回东风/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '修改整组' }));
    await user.click(within(palette).getByRole('button', { name: /南风，已使用 0 张/ }));
    expect(store.getState().document.hand.melds).toEqual([createPungMeld('pung-east', 'south')]);

    await user.click(screen.getByRole('button', { name: '删除整组' }));
    expect(store.getState().document.hand.melds).toEqual([]);
    await user.click(screen.getByRole('button', { name: '撤销上次牌面修改' }));
    expect(store.getState().document.hand.melds).toEqual([createPungMeld('pung-east', 'south')]);
  });

  it('does not force a direct/added selector and upgrades a pung through the recorded flow', async () => {
    const user = userEvent.setup();
    const document = createCalculatorDocument({
      schemaVersion: 1,
      ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
      hand: createHandSnapshot({ melds: [createPungMeld('pung-red', 'red')] }),
      context: createWinContext('discard'),
    });
    const store = createCalculatorStore(commonSimpleRulePackage, document);
    render(<CalculatorPage store={store} />);
    const palette = screen.getByRole('heading', { name: '选牌器' }).closest('section')!;

    expect(screen.queryByText('direct')).not.toBeInTheDocument();
    expect(screen.queryByText('added')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '升级加杠' }));
    expect(screen.getByText('选择红中完成加杠。')).toBeVisible();
    await user.click(within(palette).getByRole('button', { name: /红中，已使用 3 张/ }));
    expect(store.getState().document.hand.melds[0]).toMatchObject({
      type: 'kong',
      exposure: 'open',
      openKind: 'added',
    });
  });
});
