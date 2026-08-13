import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createEngineErrorRecoveryService } from '../../application/analysis-lifecycle';
import { createCalculatorStore } from '../../application/calculator/calculator-store';
import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import {
  createCalculatorDocument,
  createHandSnapshot,
  createWinContext,
  knownContextValue,
} from '../../domain/mahjong';
import { EngineErrorRecoveryPanel } from './EngineErrorRecoveryPanel';

function failingStore() {
  return createCalculatorStore(
    commonSimpleRulePackage,
    createCalculatorDocument({
      schemaVersion: 1,
      ruleRef: commonSimpleRulePackage.manifest,
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
        seatWind: knownContextValue('east'),
        roundWind: knownContextValue('south'),
      }),
    }),
    () => {
      throw new Error('failure');
    },
  );
}

describe('EngineErrorRecoveryPanel', () => {
  it('offers Retry, Undo, and manual Copy Issue Info without showing a guessed result', async () => {
    const user = userEvent.setup();
    const service = createEngineErrorRecoveryService({
      store: failingStore(),
      draftProtectionPort: { protectCurrentDraft: vi.fn().mockResolvedValue(undefined) },
      undoPort: { undo: vi.fn(() => true) },
      clipboardPort: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      appVersion: '0.1.0',
      engineVersion: '0.2.0',
    });
    await service.runAnalysis();
    render(<EngineErrorRecoveryPanel service={service} />);

    expect(screen.getByRole('heading', { name: '本次计算异常' })).toBeVisible();
    expect(screen.getByText(/没有输出猜测结果/)).toBeVisible();
    expect(screen.getByRole('button', { name: '重试' })).toBeVisible();
    expect(screen.getByRole('button', { name: '撤销最近操作' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: '复制问题信息' }));
    expect(
      screen.getByRole<HTMLTextAreaElement>('textbox', { name: /当前浏览器无法直接复制/ }).value,
    ).toContain('errorCode=ENGINE_ANALYSIS_FAILED');
  });
});
