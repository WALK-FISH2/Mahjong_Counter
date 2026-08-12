import type { HandSnapshotInput } from '../../../domain/mahjong/hand';
import type { RuleRef } from '../../../domain/mahjong/calculator-document';
import type { StructureKey } from '../../../domain/rules/structure-definition';

export type StructureRuleTestCase = Readonly<{
  id: string;
  ruleRef: RuleRef;
  title: string;
  tags: readonly string[];
  calculator: Readonly<{ hand: HandSnapshotInput }>;
  expected: Readonly<{
    status: 'STRUCTURAL_WIN' | 'NOT_WINNING';
    structureKeys: readonly StructureKey[];
    minimumDecompositionCount?: number;
    minimumWinningTilePlacementCount?: number;
  }>;
  sourceRefs: readonly string[];
}>;

const RULE_REF = Object.freeze({ ruleId: 'common-simple', ruleVersion: '1.0.0' });
const SOURCE_REFS = Object.freeze(['SRC-A01']);

export const COMMON_SIMPLE_STRUCTURE_RULE_CASES = Object.freeze([
  {
    id: 'structure-standard-positive',
    ruleRef: RULE_REF,
    title: '标准结构：四副面子与一对将牌',
    tags: ['structure', 'standard', 'positive'],
    calculator: {
      hand: {
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
      },
    },
    expected: {
      status: 'STRUCTURAL_WIN',
      structureKeys: ['standard-meld-pair'],
      minimumDecompositionCount: 1,
      minimumWinningTilePlacementCount: 1,
    },
    sourceRefs: SOURCE_REFS,
  },
  {
    id: 'structure-standard-negative',
    ruleRef: RULE_REF,
    title: '标准结构反例：缺少将牌',
    tags: ['structure', 'standard', 'negative'],
    calculator: {
      hand: {
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
        winningTile: 'green',
      },
    },
    expected: { status: 'NOT_WINNING', structureKeys: [] },
    sourceRefs: SOURCE_REFS,
  },
  {
    id: 'structure-seven-pairs-positive',
    ruleRef: RULE_REF,
    title: '七对：四张相同牌按规则包解释为两对',
    tags: ['structure', 'seven-pairs', 'positive', 'quad'],
    calculator: {
      hand: {
        concealed: ['m1', 'm1', 'm1', 'm1', 'm2', 'm2', 'm3', 'm3', 'p4', 'p4', 'p5', 'p5', 'east'],
        winningTile: 'east',
      },
    },
    expected: {
      status: 'STRUCTURAL_WIN',
      structureKeys: ['seven-pairs'],
      minimumDecompositionCount: 1,
      minimumWinningTilePlacementCount: 1,
    },
    sourceRefs: SOURCE_REFS,
  },
  {
    id: 'structure-seven-pairs-negative',
    ruleRef: RULE_REF,
    title: '七对反例：两张单牌不能组成七对',
    tags: ['structure', 'seven-pairs', 'negative'],
    calculator: {
      hand: {
        concealed: ['m1', 'm1', 'm2', 'm2', 'm3', 'm3', 'p4', 'p4', 'p5', 'p5', 'p6', 'p6', 'east'],
        winningTile: 'south',
      },
    },
    expected: { status: 'NOT_WINNING', structureKeys: [] },
    sourceRefs: SOURCE_REFS,
  },
  {
    id: 'structure-thirteen-orphans-positive',
    ruleRef: RULE_REF,
    title: '十三幺：十三种幺九字牌与其中一对',
    tags: ['structure', 'thirteen-orphans', 'positive'],
    calculator: {
      hand: {
        concealed: [
          'm1',
          'm9',
          'p1',
          'p9',
          's1',
          's9',
          'east',
          'south',
          'west',
          'north',
          'red',
          'green',
          'white',
        ],
        winningTile: 'east',
      },
    },
    expected: {
      status: 'STRUCTURAL_WIN',
      structureKeys: ['thirteen-orphans'],
      minimumDecompositionCount: 1,
      minimumWinningTilePlacementCount: 1,
    },
    sourceRefs: SOURCE_REFS,
  },
  {
    id: 'structure-thirteen-orphans-negative',
    ruleRef: RULE_REF,
    title: '十三幺反例：额外中张且未形成对子',
    tags: ['structure', 'thirteen-orphans', 'negative'],
    calculator: {
      hand: {
        concealed: [
          'm1',
          'm9',
          'p1',
          'p9',
          's1',
          's9',
          'east',
          'south',
          'west',
          'north',
          'red',
          'green',
          'white',
        ],
        winningTile: 'm2',
      },
    },
    expected: { status: 'NOT_WINNING', structureKeys: [] },
    sourceRefs: SOURCE_REFS,
  },
  {
    id: 'structure-multiple-types-positive',
    ruleRef: RULE_REF,
    title: '多结构并行：同一牌面同时满足标准结构与七对',
    tags: ['structure', 'standard', 'seven-pairs', 'multi-structure', 'positive'],
    calculator: {
      hand: {
        concealed: ['m1', 'm1', 'm2', 'm2', 'm3', 'm3', 'p4', 'p4', 'p5', 'p5', 'p6', 'p6', 'east'],
        winningTile: 'east',
      },
    },
    expected: {
      status: 'STRUCTURAL_WIN',
      structureKeys: ['standard-meld-pair', 'seven-pairs'],
      minimumDecompositionCount: 2,
      minimumWinningTilePlacementCount: 2,
    },
    sourceRefs: SOURCE_REFS,
  },
  {
    id: 'structure-multiple-decompositions-positive',
    ruleRef: RULE_REF,
    title: '标准结构多拆分：刻子与顺子拆分均被完整保留',
    tags: ['structure', 'standard', 'multi-decomposition', 'positive'],
    calculator: {
      hand: {
        concealed: ['m1', 'm1', 'm1', 'm2', 'm2', 'm2', 'm3', 'm3', 'm3', 'm4', 'm4', 'm4', 'm5'],
        winningTile: 'm5',
      },
    },
    expected: {
      status: 'STRUCTURAL_WIN',
      structureKeys: ['standard-meld-pair'],
      minimumDecompositionCount: 2,
      minimumWinningTilePlacementCount: 2,
    },
    sourceRefs: SOURCE_REFS,
  },
  {
    id: 'structure-multiple-decompositions-negative',
    ruleRef: RULE_REF,
    title: '多拆分反例：密集组合仍缺少合法将牌',
    tags: ['structure', 'standard', 'multi-decomposition', 'negative'],
    calculator: {
      hand: {
        concealed: ['m1', 'm1', 'm1', 'm2', 'm2', 'm2', 'm3', 'm3', 'm3', 'm4', 'm4', 'm4', 'east'],
        winningTile: 'south',
      },
    },
    expected: { status: 'NOT_WINNING', structureKeys: [] },
    sourceRefs: SOURCE_REFS,
  },
  {
    id: 'structure-declared-chow-positive',
    ruleRef: RULE_REF,
    title: '固定吃牌不参与暗手重新拆分',
    tags: ['structure', 'standard', 'declared-meld', 'chow', 'positive'],
    calculator: {
      hand: {
        concealed: ['p1', 'p2', 'p3', 's1', 's2', 's3', 'east', 'east', 'east', 'white'],
        melds: [{ id: 'declared-chow', type: 'chow', tiles: ['m1', 'm2', 'm3'] }],
        winningTile: 'white',
      },
    },
    expected: {
      status: 'STRUCTURAL_WIN',
      structureKeys: ['standard-meld-pair'],
      minimumDecompositionCount: 1,
      minimumWinningTilePlacementCount: 1,
    },
    sourceRefs: SOURCE_REFS,
  },
  {
    id: 'structure-declared-kong-positive',
    ruleRef: RULE_REF,
    title: '固定明杠按一副面子进入结构结果',
    tags: ['structure', 'standard', 'declared-meld', 'kong', 'positive'],
    calculator: {
      hand: {
        concealed: ['p1', 'p2', 'p3', 's1', 's2', 's3', 'east', 'east', 'east', 'white'],
        melds: [
          {
            id: 'declared-open-kong',
            type: 'kong',
            tile: 'red',
            exposure: 'open',
            openKind: 'direct',
          },
        ],
        winningTile: 'white',
      },
    },
    expected: {
      status: 'STRUCTURAL_WIN',
      structureKeys: ['standard-meld-pair'],
      minimumDecompositionCount: 1,
      minimumWinningTilePlacementCount: 1,
    },
    sourceRefs: SOURCE_REFS,
  },
  {
    id: 'structure-winning-placement-positive',
    ruleRef: RULE_REF,
    title: '胡牌张落入顺子的实际位置',
    tags: ['structure', 'standard', 'winning-tile-placement', 'positive'],
    calculator: {
      hand: {
        concealed: [
          'm1',
          'm2',
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
        winningTile: 'm3',
      },
    },
    expected: {
      status: 'STRUCTURAL_WIN',
      structureKeys: ['standard-meld-pair'],
      minimumDecompositionCount: 1,
      minimumWinningTilePlacementCount: 1,
    },
    sourceRefs: SOURCE_REFS,
  },
] satisfies readonly StructureRuleTestCase[]);
