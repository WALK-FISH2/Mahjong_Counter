import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { commonSimplePatternRecognizerRegistry } from '../../content/rules/common-simple/pattern-recognizers';
import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import {
  commonSimpleExtraScoringCalculatorRegistry,
  commonSimpleScoringStrategyRegistry,
} from '../../content/rules/common-simple/scoring-capabilities';
import { evaluateHand, type SystemEvaluation } from '../../domain/engine/evaluation';
import { createHandSnapshot, createWinContext, knownContextValue } from '../../domain/mahjong';
import { AnalysisResult } from './AnalysisResult';
import { getResultActionPolicy } from '../../application/calculator/result-action-policy';
import type { UserAdjustedScore } from '../../domain/engine/adjustment';

const hand = createHandSnapshot({
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
const context = createWinContext('discard', {
  seatWind: knownContextValue('south'),
  roundWind: knownContextValue('west'),
});

function evaluate(targetRule = commonSimpleRulePackage, targetContext = context) {
  return evaluateHand({
    hand,
    context: targetContext,
    rule: targetRule,
    patternRecognizers: commonSimplePatternRecognizerRegistry,
    scoringStrategies: commonSimpleScoringStrategyRegistry,
    extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
  });
}

function renderResult(result: SystemEvaluation, onSelectCandidate = vi.fn()) {
  return render(
    <AnalysisResult
      result={result}
      selectedCandidateId={result.selectedCandidateId}
      rulePackage={commonSimpleRulePackage}
      originalHand={hand}
      onSelectCandidate={onSelectCandidate}
      onOpenAdjustments={vi.fn()}
    />,
  );
}

describe('AnalysisResult Batch 14', () => {
  it.each([
    ['legal-win', '合法和牌'],
    ['structural-win-but-illegal', '结构成和，但按当前规则不能胡'],
    ['not-winning', '当前不是和牌'],
    ['incomplete-context', '和牌条件不完整'],
  ] as const)('renders the formal %s outcome', (status, title) => {
    let result: SystemEvaluation;
    if (status === 'legal-win') result = evaluate();
    else if (status === 'structural-win-but-illegal') {
      result = evaluate({
        ...commonSimpleRulePackage,
        legality: { ...commonSimpleRulePackage.legality, minimumFan: 1_000 },
      });
    } else if (status === 'incomplete-context') {
      result = evaluate(commonSimpleRulePackage, createWinContext('discard'));
    } else {
      result = evaluateHand({
        hand: createHandSnapshot({ ...hand, winningTile: 'green' }),
        context,
        rule: commonSimpleRulePackage,
        patternRecognizers: commonSimplePatternRecognizerRegistry,
        scoringStrategies: commonSimpleScoringStrategyRegistry,
        extraScoringCalculators: commonSimpleExtraScoringCalculatorRegistry,
      });
    }
    renderResult(result);
    expect(screen.getByRole('heading', { name: title })).toBeVisible();
    expect(screen.getByText('系统预设结果')).toBeVisible();
    if (status === 'structural-win-but-illegal') {
      expect(screen.getByRole('heading', { name: '当前不能胡的原因' })).toBeVisible();
    }
  });

  it('uses outcome status rather than a positive-score heuristic and keeps excluded reasons', () => {
    const actual = evaluate();
    const candidate = actual.candidates[0]!;
    const zeroCandidate = {
      ...candidate,
      score: { ...candidate.score, total: 0 },
      relation: {
        ...candidate.relation,
        excluded: Object.freeze([
          Object.freeze({
            candidate: candidate.recognition.candidates[0]!,
            status: 'EXCLUDED' as const,
            reason: 'COVERED' as const,
            excludedByPatternId: 'another',
            relationType: 'covers' as const,
          }),
        ]),
      },
    };
    const result: SystemEvaluation = Object.freeze({
      status: 'legal-win',
      ruleRef: actual.ruleRef,
      candidates: Object.freeze([zeroCandidate]),
      highestLegalCandidateIds: Object.freeze([zeroCandidate.candidateId]),
      selectedCandidateId: zeroCandidate.candidateId,
    });
    renderResult(result);
    expect(screen.getByRole('heading', { name: '合法和牌' })).toBeVisible();
    expect(screen.getByText('0')).toBeVisible();
    expect(
      within(screen.getByTestId('excluded-patterns')).getByText('已被更高层番型覆盖'),
    ).toBeVisible();
  });

  it('shows arranged winning placement, complete explanation order, sources, and tied switches', async () => {
    const user = userEvent.setup();
    const actual = evaluate();
    const first = actual.candidates[0]!;
    const second = Object.freeze({ ...first, candidateId: `${first.candidateId}:tie` });
    const result: SystemEvaluation = Object.freeze({
      status: 'legal-win',
      ruleRef: actual.ruleRef,
      candidates: Object.freeze([first, second]),
      highestLegalCandidateIds: Object.freeze([first.candidateId, second.candidateId]),
      selectedCandidateId: first.candidateId,
    });
    const onSelect = vi.fn();
    const { container } = renderResult(result, onSelect);

    expect(container.querySelector('.result-tile--winning')).not.toBeNull();
    expect(screen.getByRole('group', { name: '并列最高结果' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '方案 2' }));
    expect(onSelect).toHaveBeenCalledWith(second.candidateId);
    await user.click(screen.getByText('查看完整计算过程'));
    expect(screen.getByText('规则版本：common-simple@1.0.0')).toBeVisible();
    expect(screen.getByText(/计算顺序：结构拆分/)).toBeVisible();
    expect(screen.getByRole('heading', { name: '3. 番型关系处理' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '规则来源' })).toBeVisible();
  });

  it('offers a secondary discard-analysis entry only for a legal win', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const result = evaluate();
    render(
      <AnalysisResult
        result={result}
        selectedCandidateId={result.selectedCandidateId}
        rulePackage={commonSimpleRulePackage}
        originalHand={hand}
        onSelectCandidate={() => undefined}
        onOpenAdjustments={() => undefined}
        onContinueDiscardAnalysis={onContinue}
      />,
    );

    await user.click(screen.getByRole('button', { name: '忽略当前和牌，继续分析出牌' }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('switches all three result layers and keeps the user result visibly warned', async () => {
    const user = userEvent.setup();
    const result = evaluate();
    const onSelectLayer = vi.fn();
    const userAdjustedResult: UserAdjustedScore = Object.freeze({
      candidateId: result.candidates[0]!.candidateId,
      baseEvaluationStatus: result.status,
      baseLegality: result.candidates[0]!.legality,
      score: Object.freeze({ ...result.candidates[0]!.score, total: 0 }),
      patterns: Object.freeze([]),
      adjustmentStates: Object.freeze([]),
    });
    render(
      <AnalysisResult
        result={result}
        selectedCandidateId={result.selectedCandidateId}
        rulePackage={commonSimpleRulePackage}
        originalHand={hand}
        onSelectCandidate={vi.fn()}
        onOpenAdjustments={vi.fn()}
        activeLayer="user-adjustment"
        availableLayers={['preset', 'session-rule', 'user-adjustment']}
        userAdjustedResult={userAdjustedResult}
        actionPolicy={getResultActionPolicy(result.status)}
        onSelectLayer={onSelectLayer}
      />,
    );
    expect(screen.getByText('用户调整结果 · 人工调整不改变基础合法性')).toBeVisible();
    expect(screen.getByText(/用户调整合计/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: '系统预设结果' }));
    expect(onSelectLayer).toHaveBeenCalledWith('preset');
  });

  it('renders the formal action matrix, including blocked incomplete sharing', () => {
    const incomplete = evaluate(commonSimpleRulePackage, createWinContext('discard'));
    render(
      <AnalysisResult
        result={incomplete}
        selectedCandidateId={incomplete.selectedCandidateId}
        rulePackage={commonSimpleRulePackage}
        originalHand={hand}
        onSelectCandidate={vi.fn()}
        onOpenAdjustments={vi.fn()}
        actionPolicy={getResultActionPolicy(incomplete.status)}
      />,
    );
    expect(screen.queryByRole('button', { name: '保存牌例' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '复制结果' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '分享链接' })).not.toBeInTheDocument();
  });
});
