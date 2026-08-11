import { describe, expect, it } from 'vitest';

import { createCalculatorDocument, type CalculatorDocument } from './calculator-document';
import {
  reviseCalculatorDocument,
  type CalculatorDocumentSemanticPatch,
} from './calculator-document-revision';
import { createWinContext, knownContextValue } from './context';
import { createHandSnapshot } from './hand';
import { startPungInput } from './meld-input-state';

function createDocument(revision = 4): CalculatorDocument {
  return createCalculatorDocument({
    schemaVersion: 1,
    ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
    hand: createHandSnapshot({ concealed: ['m1'] }),
    context: createWinContext(),
    source: { kind: 'draft' },
    revision,
  });
}

describe('CalculatorDocument revision tools', () => {
  it('increments revision for every supported calculation-semantic field', () => {
    const original = createDocument();
    const patches: readonly CalculatorDocumentSemanticPatch[] = [
      { ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.1' } },
      { hand: createHandSnapshot({ concealed: ['m2'] }) },
      { context: createWinContext('self-draw', { lastTile: knownContextValue(true) }) },
      {
        temporaryRuleAdjustment: {
          baseRuleRef: original.ruleRef,
          values: { minimumFan: 8 },
        },
      },
      { fanAdjustments: [{ patternId: 'allPungs', action: 'exclude' }] },
      { transientInput: startPungInput() },
    ];

    for (const patch of patches) {
      const revised = reviseCalculatorDocument(original, patch);

      expect(revised.revision).toBe(original.revision + 1);
      expect(revised.source).toEqual(original.source);
    }

    expect(original.revision).toBe(4);
  });

  it('keeps each revision tied to one immutable semantic snapshot', () => {
    const original = createDocument();
    const handChanged = reviseCalculatorDocument(original, {
      hand: createHandSnapshot({ concealed: ['p1', 'p2'] }),
    });
    const contextChanged = reviseCalculatorDocument(handChanged, {
      context: createWinContext('self-draw'),
    });

    expect(original).toMatchObject({ revision: 4, hand: { concealed: ['m1'] } });
    expect(handChanged).toMatchObject({ revision: 5, hand: { concealed: ['p1', 'p2'] } });
    expect(contextChanged).toMatchObject({ revision: 6, context: { mode: 'self-draw' } });
  });

  it('refuses to overflow the safe integer revision range', () => {
    const document = createDocument(Number.MAX_SAFE_INTEGER);

    expect(() =>
      reviseCalculatorDocument(document, { hand: createHandSnapshot({ concealed: ['m9'] }) }),
    ).toThrow(RangeError);
  });
});
