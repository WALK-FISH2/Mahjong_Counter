import { describe, expect, it } from 'vitest';

import { createNavigationStore } from './navigation-state';

describe('Navigation State', () => {
  it('handles back in Modal, detail, module, then browser order', () => {
    const store = createNavigationStore();
    store.getState().visitModule('rules');
    store.getState().pushDetail('pattern-1');
    store.getState().openModal('rule-picker');

    expect(store.getState().back()).toEqual({ handled: true, kind: 'modal' });
    expect(store.getState().back()).toEqual({ handled: true, kind: 'detail' });
    expect(store.getState().back()).toEqual({
      handled: true,
      kind: 'module',
      module: 'calculator',
    });
    expect(store.getState().back()).toEqual({ handled: false, kind: 'browser' });
  });

  it('records a finite non-negative Calculator scroll position', () => {
    const store = createNavigationStore();
    store.getState().recordCalculatorScroll(480);
    store.getState().recordCalculatorScroll(-1);
    expect(store.getState().calculatorScrollY).toBe(480);
  });
});
