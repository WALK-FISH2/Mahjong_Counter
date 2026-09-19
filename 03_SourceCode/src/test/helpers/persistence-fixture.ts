import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import { commonSimplePatternRecognizerRegistry } from '../../content/rules/common-simple/pattern-recognizers';
import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../content/rules/common-simple/scoring-capabilities';
import { createCommonSimpleRuleRepository } from '../../infrastructure/rule-repository/common-simple-rule-repository';
import {
  createCalculatorDocument,
  createHandSnapshot,
  createWinContext,
  knownContextValue,
  type CalculatorDocument,
} from '../../domain/mahjong';
import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import { evaluateHand } from '../../domain/engine/evaluation';
import { createCalculatorStore } from '../../application/calculator/calculator-store';
import {
  createCalculatorReplaceGuard,
  InMemoryCalculatorDraftPort,
} from '../../application/calculator/replace-calculator';
import { createSavedExampleService } from '../../application/examples';
import { MahjongDatabase } from '../../infrastructure/db/mahjong-database';
import { DexieSavedExampleRepository } from '../../infrastructure/db/dexie-saved-example-repository';

export const persistenceDocument = createCalculatorDocument({
  schemaVersion: 1,
  ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
  revision: 17,
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
    ],
    winningTile: 'white',
  }),
  context: createWinContext('discard', {
    seatWind: knownContextValue('south'),
    roundWind: knownContextValue('west'),
  }),
});

export function persistenceFixture(
  document = persistenceDocument,
  rule: RulePackageDefinition = commonSimpleRulePackage,
) {
  const options = { indexedDB: new IDBFactory(), IDBKeyRange };
  const db = new MahjongDatabase('batch-20-test', options);
  const repository = new DexieSavedExampleRepository(db);
  const store = createCalculatorStore(
    rule,
    document,
    (current: CalculatorDocument, effective: RulePackageDefinition) =>
      evaluateHand({
        hand: current.hand,
        context: current.context,
        rule: effective,
        patternRecognizers: commonSimplePatternRecognizerRegistry,
        scoringStrategies: commonSimpleScoringStrategyRegistry,
        extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
      }),
    {
      scoringStrategies: commonSimpleScoringStrategyRegistry,
      extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
    },
  );
  const drafts = new InMemoryCalculatorDraftPort();
  const guard = createCalculatorReplaceGuard(store, drafts);
  let serial = 0;
  let time = '2026-09-09T00:00:00.000Z';
  const service = createSavedExampleService({
    calculator: store,
    repository,
    rules: createCommonSimpleRuleRepository(),
    replaceGuard: guard,
    clock: { now: () => time },
    ids: { next: () => `saved-${++serial}` },
    engineVersion: '0.1.0',
    databaseSchemaVersion: 1,
  });
  return {
    db,
    repository,
    store,
    service,
    options,
    drafts,
    advanceTime: () => {
      time = '2026-09-10T00:00:00.000Z';
    },
  };
}
