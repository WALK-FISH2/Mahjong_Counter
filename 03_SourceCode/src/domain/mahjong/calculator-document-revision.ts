import { createCalculatorDocument, type CalculatorDocument } from './calculator-document';

type CalculatorSemanticFields = Pick<
  CalculatorDocument,
  'ruleRef' | 'hand' | 'context' | 'temporaryRuleAdjustment' | 'fanAdjustments' | 'transientInput'
>;

type AtLeastOne<T> = {
  [Key in keyof T]-?: Readonly<Pick<T, Key> & Partial<Omit<T, Key>>>;
}[keyof T];

export type CalculatorDocumentSemanticPatch = AtLeastOne<CalculatorSemanticFields>;

export function reviseCalculatorDocument(
  document: CalculatorDocument,
  patch: CalculatorDocumentSemanticPatch,
): CalculatorDocument {
  if (document.revision >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError('CalculatorDocument revision cannot exceed Number.MAX_SAFE_INTEGER.');
  }

  return createCalculatorDocument({
    ...document,
    ...patch,
    revision: document.revision + 1,
  });
}
