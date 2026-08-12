import { describe, expect, it } from 'vitest';

import { commonSimplePatternRecognizerRegistry } from '../../../content/rules/common-simple/pattern-recognizers';
import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../../content/rules/common-simple/scoring-capabilities';
import { commonSimpleRulePackage } from '../../../content/rules/common-simple/parsed-rule-package';
import { createWinContext, knownContextValue } from '../../mahjong/context';
import { createHandSnapshot } from '../../mahjong/hand';
import { evaluateHand, HandEvaluationValidationError } from './evaluate-hand';

const rule = commonSimpleRulePackage;
const completeContext = createWinContext('discard', {
  seatWind: knownContextValue('south'),
  roundWind: knownContextValue('west'),
});
const winningHand = createHandSnapshot({
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
});

function evaluate(hand = winningHand, context = completeContext, targetRule = rule) {
  return evaluateHand({
    hand,
    context,
    rule: targetRule,
    patternRecognizers: commonSimplePatternRecognizerRegistry,
    scoringStrategies: commonSimpleScoringStrategyRegistry,
    extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
  });
}

describe('evaluateHand Domain API', () => {
  it('runs the entire M3/M4 pipeline and returns an explainable legal result', () => {
    const result = evaluate();
    expect(result.status).toBe('legal-win');
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.highestLegalCandidateIds.length).toBeGreaterThan(0);
    expect(result.candidates.every(({ explanation }) => explanation.sourceRefs.length > 0)).toBe(
      true,
    );
    expect(result.candidates.every(({ score }) => score.unit === 'fan')).toBe(true);
  });

  it('keeps the complete calculation trace stable as an Explanation snapshot', () => {
    const result = evaluate();
    const explanation = result.candidates[0]!.explanation;

    expect({
      ruleRef: explanation.ruleRef,
      traceNodeTypes: [
        explanation.structure.nodeType,
        explanation.patternNodes[0]?.nodeType,
        explanation.relationNodes[0]?.nodeType,
        explanation.scoringNodes.at(-1)?.nodeType,
        explanation.legalityNodes[0]?.nodeType,
      ],
      structureReason: explanation.structure.reasonCode,
      scoreReason: explanation.scoringNodes.at(-1)?.reasonCode,
      legalityReason: explanation.legalityNodes[0]?.reasonCode,
      sourceRefs: explanation.sourceRefs,
    }).toMatchInlineSnapshot(`
      {
        "legalityReason": "LEGAL",
        "ruleRef": {
          "ruleId": "common-simple",
          "ruleVersion": "1.0.0",
        },
        "scoreReason": "CAP_NOT_APPLIED",
        "sourceRefs": [
          "SRC-A01",
        ],
        "structureReason": "WINNING_DECOMPOSITION",
        "traceNodeTypes": [
          "structure",
          "pattern",
          "relation",
          "scoring-cap",
          "legality",
        ],
      }
    `);
  });

  it('returns incomplete context without inventing seat or round wind', () => {
    const result = evaluate(winningHand, createWinContext('discard'));
    expect(result.status).toBe('incomplete-context');
    expect(
      result.candidates.every(({ legality }) => legality.status === 'incomplete-context'),
    ).toBe(true);
  });

  it('returns not-winning when all enabled structures have no decomposition', () => {
    const result = evaluate(
      createHandSnapshot({
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
      }),
    );
    expect(result.status).toBe('not-winning');
    expect(result.candidates).toHaveLength(0);
  });

  it('returns structural-win-but-illegal when an effective minimum exceeds every score', () => {
    const strictRule = { ...rule, legality: { ...rule.legality, minimumFan: 1_000 } };
    const result = evaluate(winningHand, completeContext, strictRule);
    expect(result.status).toBe('structural-win-but-illegal');
    expect(result.candidates.every(({ legality }) => legality.status === 'illegal')).toBe(true);
  });

  it('fails hard validation without mutating or silently correcting the HandSnapshot', () => {
    const invalid = createHandSnapshot({
      concealed: ['m1', 'm1', 'm1', 'm1', 'm1'],
      winningTile: 'm2',
    });
    expect(() => evaluate(invalid)).toThrow(HandEvaluationValidationError);
    expect(invalid.concealed).toHaveLength(5);
  });

  it('keeps all M3 decompositions and placements in independent candidates', () => {
    const multi = createHandSnapshot({
      concealed: ['m1', 'm1', 'm2', 'm2', 'm3', 'm3', 'p4', 'p4', 'p5', 'p5', 'p6', 'p6', 'east'],
      winningTile: 'east',
    });
    const result = evaluate(multi);
    expect(result.status).toBe('legal-win');
    expect(
      new Set(result.candidates.map(({ placed }) => placed.decomposition.structureKey)),
    ).toEqual(new Set(['standard-meld-pair', 'seven-pairs']));
    expect(new Set(result.candidates.map(({ candidateId }) => candidateId)).size).toBe(
      result.candidates.length,
    );
  });
});
