import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { CandidateResult } from '../../domain/engine/evaluation';
import type { WaitAnalysisResult } from '../../domain/engine/ready-analysis';
import { ReadyAnalysisPanel } from './ReadyAnalysisPanel';

function legal(tile: 'm1' | 'm2', score: number, structureKey = 'standard-meld-pair') {
  const best = {
    candidateId: `${tile}-${structureKey}`,
    score: { total: score, unit: '番' },
    placed: { decomposition: { structureKey } },
  } as CandidateResult;
  return { tile, status: 'legal' as const, best, highestLegalCandidates: [best] };
}

const primary: WaitAnalysisResult = {
  candidates: [
    legal('m2', 2),
    legal('m1', 4),
    { tile: 'east', status: 'pending-context', evaluation: {} as never },
    {
      tile: 'white',
      status: 'structural-only',
      reasons: [{ reasonCode: 'MINIMUM_FAN_NOT_MET', data: { actualFan: 0, minimumFan: 1 } }],
    },
  ],
  legalWaitCount: 2,
};

describe('ReadyAnalysisPanel', () => {
  it('renders real tile assets, highest legal results, and three classifications', () => {
    const { container } = render(
      <ReadyAnalysisPanel
        availableKind="wait-analysis"
        status="result"
        result={{
          kind: 'wait-analysis',
          documentRevision: 0,
          primaryMode: 'discard',
          alternateMode: 'self-draw',
          primary,
          alternate: { candidates: [legal('m1', 6)], legalWaitCount: 1 },
        }}
        sortMode="highest-score"
        selectedDiscard={null}
        onAnalyze={vi.fn()}
        onCancel={vi.fn()}
        onSelectDiscard={vi.fn()}
      />,
    );

    const legalSection = screen
      .getByRole('heading', { name: '合法待胡牌（2）' })
      .closest('section')!;
    expect(within(legalSection).getAllByText(/最高合法结果/)[0]).toHaveTextContent('4 番');
    expect(screen.getByRole('heading', { name: '待补条件（1）' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '仅结构可和（1）' })).toBeVisible();
    expect(container.querySelectorAll('[data-tile-asset]').length).toBeGreaterThan(0);
    expect(screen.getByText(/查看点炮与自摸差异/)).toBeVisible();
  });

  it('selects a discard solution without deriving waits in the UI', async () => {
    const user = userEvent.setup();
    const onSelectDiscard = vi.fn();
    render(
      <ReadyAnalysisPanel
        availableKind="discard-to-ready"
        status="result"
        result={{
          kind: 'discard-to-ready',
          documentRevision: 0,
          primaryMode: 'discard',
          alternateMode: 'self-draw',
          primary: {
            candidates: [
              { discard: 'm2', waits: { candidates: [legal('m1', 2)], legalWaitCount: 1 } },
              { discard: 'm1', waits: primary },
            ],
          },
          alternate: { candidates: [] },
        }}
        sortMode="wait-count"
        selectedDiscard="m1"
        onAnalyze={vi.fn()}
        onCancel={vi.fn()}
        onSelectDiscard={onSelectDiscard}
      />,
    );

    await user.click(screen.getByRole('button', { name: '打二万 · 1 口' }));
    expect(onSelectDiscard).toHaveBeenCalledWith('m2');
  });

  it('keeps tied highest decompositions available for explicit switching', async () => {
    const user = userEvent.setup();
    const standard = legal('m1', 8, 'standard-meld-pair');
    const sevenPairs = legal('m1', 8, 'seven-pairs');
    render(
      <ReadyAnalysisPanel
        availableKind="wait-analysis"
        status="result"
        result={{
          kind: 'wait-analysis',
          documentRevision: 0,
          primaryMode: 'discard',
          alternateMode: 'self-draw',
          primary: {
            candidates: [
              {
                ...standard,
                highestLegalCandidates: [standard.best, sevenPairs.best],
              },
            ],
            legalWaitCount: 1,
          },
          alternate: { candidates: [], legalWaitCount: 0 },
        }}
        sortMode="highest-score"
        selectedDiscard={null}
        onAnalyze={vi.fn()}
        onCancel={vi.fn()}
        onSelectDiscard={vi.fn()}
      />,
    );

    const switcher = screen.getByLabelText('一万并列最高拆分');
    await user.selectOptions(switcher, sevenPairs.best.candidateId);
    expect(screen.getByText('当前查看：七对')).toBeVisible();
  });
});
