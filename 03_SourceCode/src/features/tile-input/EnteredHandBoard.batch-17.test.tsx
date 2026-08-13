import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EnteredHandBoard } from './EnteredHandBoard';

describe('EnteredHandBoard discard candidate markers', () => {
  it('marks every equivalent duplicate and selects a solution without removing the tile', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onSelect = vi.fn();
    render(
      <EnteredHandBoard
        concealedTiles={[
          { tile: 'm1', originalIndex: 0 },
          { tile: 'm1', originalIndex: 1 },
          { tile: 'm2', originalIndex: 2 },
        ]}
        melds={[]}
        flowers={[]}
        winningTile={null}
        isArranged={false}
        canUndo={false}
        selectingWinningTile={false}
        distinguishOpenKongKind={false}
        discardCandidateTiles={['m1']}
        selectedDiscardTile="m1"
        canUpgradePung={() => false}
        onRemoveConcealed={onRemove}
        onArrange={vi.fn()}
        onSelectWinningTile={vi.fn()}
        onRemoveWinningTile={vi.fn()}
        onEditMeld={vi.fn()}
        onUpgradePung={vi.fn()}
        onRemoveMeld={vi.fn()}
        onRemoveFlower={vi.fn()}
        onUndo={vi.fn()}
        onSelectDiscardCandidate={onSelect}
      />,
    );

    const markers = screen.getAllByRole('button', { name: '查看打出一万后的听牌' });
    expect(markers).toHaveLength(2);
    expect(markers.every((marker) => marker.getAttribute('aria-pressed') === 'true')).toBe(true);
    await user.click(markers[1]!);
    expect(onSelect).toHaveBeenCalledWith('m1');
    expect(onRemove).not.toHaveBeenCalled();
  });
});
