import { describe, expect, it, vi } from 'vitest';

import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import {
  createCalculatorDocument,
  createChowMeld,
  createHandSnapshot,
  createWinContext,
  knownContextValue,
} from '../../domain/mahjong';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import { createCalculatorStore, getCorrectionIssues } from './calculator-store';
import {
  CALCULATOR_REPLACEMENT_REASONS,
  createCalculatorReplaceGuard,
  createNewHandReplacement,
  createRuleSwitchReplacement,
  type CalculatorDraftPort,
} from './replace-calculator';

function documentWithInput() {
  return createCalculatorDocument({
    schemaVersion: 1,
    ruleRef: commonSimpleRulePackage.manifest,
    hand: createHandSnapshot({ concealed: ['m1', 'p1'], flowers: ['spring'] }),
    context: createWinContext('discard', { seatWind: knownContextValue('east') }),
    temporaryRuleAdjustment: {
      baseRuleRef: commonSimpleRulePackage.manifest,
      values: { fixture: true },
    },
    fanAdjustments: [{ patternId: 'fixture', action: 'exclude' }],
  });
}

function targetRule(overrides: Partial<RulePackageDefinition> = {}): RulePackageDefinition {
  return {
    ...commonSimpleRulePackage,
    ...overrides,
    manifest: {
      ...commonSimpleRulePackage.manifest,
      ruleId: 'target-rule',
      ruleVersion: '2.0.0',
    },
  };
}

describe('Calculator Replace Guard', () => {
  it.each(CALCULATOR_REPLACEMENT_REASONS)(
    'protects the draft and confirms before applying %s',
    async (reason) => {
      const events: string[] = [];
      const store = createCalculatorStore(commonSimpleRulePackage, documentWithInput());
      const draftPort: CalculatorDraftPort = {
        protectBeforeReplacement: () => {
          events.push('draft');
          return Promise.resolve();
        },
      };
      const guard = createCalculatorReplaceGuard(store, draftPort);

      const result = await guard.prepareToReplaceCalculator(
        reason,
        () => {
          events.push('confirm');
          return true;
        },
        () => {
          events.push('replacement');
          return createNewHandReplacement(commonSimpleRulePackage);
        },
      );

      expect(result.status).toBe('replaced');
      expect(events).toEqual(['draft', 'confirm', 'replacement']);
      expect(store.getState().document.hand.concealed).toEqual([]);
    },
  );

  it('does not create or apply a replacement when confirmation is cancelled', async () => {
    const original = documentWithInput();
    const store = createCalculatorStore(commonSimpleRulePackage, original);
    const replacement = vi.fn(() => createNewHandReplacement(commonSimpleRulePackage));
    const guard = createCalculatorReplaceGuard(store, {
      protectBeforeReplacement: () => Promise.resolve(),
    });

    await expect(
      guard.prepareToReplaceCalculator('new-hand', () => false, replacement),
    ).resolves.toEqual({ status: 'cancelled' });
    expect(replacement).not.toHaveBeenCalled();
    expect(store.getState().document).toBe(original);
  });

  it('fails closed when draft protection fails', async () => {
    const original = documentWithInput();
    const store = createCalculatorStore(commonSimpleRulePackage, original);
    const confirmation = vi.fn(() => true);
    const guard = createCalculatorReplaceGuard(store, {
      protectBeforeReplacement: () => Promise.reject(new Error('draft unavailable')),
    });

    expect(
      (
        await guard.prepareToReplaceCalculator('share', confirmation, () =>
          createNewHandReplacement(commonSimpleRulePackage),
        )
      ).status,
    ).toBe('draft-protection-failed');
    expect(confirmation).not.toHaveBeenCalled();
    expect(store.getState().document).toBe(original);
  });
});

describe('New Hand and Rule Switch', () => {
  it('clears calculation state while retaining the current rule package', () => {
    const replacement = createNewHandReplacement(commonSimpleRulePackage);

    expect(replacement.rulePackage).toBe(commonSimpleRulePackage);
    expect(replacement.document).toMatchObject({
      hand: { concealed: [], melds: [], flowers: [], winningTile: null },
      context: { mode: 'discard', values: {} },
      temporaryRuleAdjustment: null,
      fanAdjustments: [],
      source: { kind: 'new' },
    });
  });

  it('supports remove, preserve-for-correction, and clear compatibility paths', () => {
    const source = createCalculatorDocument({
      ...documentWithInput(),
      hand: createHandSnapshot({
        concealed: ['m1', 'p1'],
        melds: [createChowMeld('chow-1', ['m1', 'm2', 'm3'])],
        flowers: ['spring'],
      }),
      context: createWinContext('discard', {
        seatWind: knownContextValue('east'),
        obsolete: knownContextValue(true),
      }),
    });
    const target = targetRule({
      tileSet: {
        enabledTiles: ['m1', 'm2', 'm3'],
        maxCopies: { m1: 4, m2: 4, m3: 4 },
        groups: [{ id: 'fixture', labelKey: 'fixture', tiles: ['m1', 'm2', 'm3'] }],
      },
      handModel: {
        ...commonSimpleRulePackage.handModel,
        allowedMeldTypes: [],
        maxDeclaredMelds: 0,
        flowerPolicy: 'none',
      },
      contexts: [],
    });

    const removed = createRuleSwitchReplacement(source, target, 'remove-incompatible').document;
    const preserved = createRuleSwitchReplacement(source, target, 'preserve-and-correct').document;
    const cleared = createRuleSwitchReplacement(source, target, 'clear').document;

    expect(removed.hand).toMatchObject({ concealed: ['m1'], melds: [], flowers: [] });
    expect(removed.context.values).toEqual({});
    expect(preserved.hand).toEqual(source.hand);
    expect(preserved.context).toEqual(source.context);
    expect(cleared.hand).toMatchObject({ concealed: [], melds: [], flowers: [] });
    for (const document of [removed, preserved, cleared]) {
      expect(document.temporaryRuleAdjustment).toBeNull();
      expect(document.fanAdjustments).toEqual([]);
    }
  });

  it('records a rule switch as a reversible store replacement', () => {
    const source = documentWithInput();
    const target = targetRule();
    const store = createCalculatorStore(commonSimpleRulePackage, source);
    const replacement = createRuleSwitchReplacement(source, target, 'preserve-and-correct');

    store
      .getState()
      .replaceCalculator(
        replacement.rulePackage,
        replacement.document,
        replacement.recordRuleSwitchUndo,
      );
    expect(store.getState().rulePackage.manifest.ruleId).toBe('target-rule');
    expect(store.getState().document.temporaryRuleAdjustment).toBeNull();
    expect(store.getState().undoRuleSwitch()).toBe(true);
    expect(store.getState().document).toBe(source);
    expect(store.getState().rulePackage).toBe(commonSimpleRulePackage);
  });

  it('marks preserved incompatibilities for explicit correction instead of silent mutation', () => {
    const source = createCalculatorDocument({
      ...documentWithInput(),
      hand: createHandSnapshot({ concealed: ['p1'], flowers: ['spring'] }),
      context: createWinContext('discard', { obsolete: knownContextValue(true) }),
    });
    const target = targetRule({
      tileSet: {
        enabledTiles: ['m1'],
        maxCopies: { m1: 4 },
        groups: [{ id: 'fixture', labelKey: 'fixture', tiles: ['m1'] }],
      },
      handModel: { ...commonSimpleRulePackage.handModel, flowerPolicy: 'none' },
      contexts: [],
    });
    const replacement = createRuleSwitchReplacement(source, target, 'preserve-and-correct');
    const store = createCalculatorStore(target, replacement.document);

    expect(store.getState().document.hand).toEqual(source.hand);
    expect(store.getState().document.context).toEqual(source.context);
    expect(store.getState().document.ruleRef).toEqual({
      ruleId: target.manifest.ruleId,
      ruleVersion: target.manifest.ruleVersion,
    });
    expect(
      store.getState().document.hand.concealed,
      'the user tile must remain until an explicit correction action',
    ).toEqual(['p1']);
    expect(getCorrectionIssues(store.getState().document, target)).not.toEqual([]);
  });
});
