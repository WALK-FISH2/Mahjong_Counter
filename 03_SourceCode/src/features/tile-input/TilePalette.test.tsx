import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TILE_CODES, type TileCode } from '../../domain/mahjong/tile';
import type { TileSetDefinition } from '../../domain/rules/tile-set';
import { TilePalette } from './TilePalette';

function tileSetFixture(count: 27 | 34 | 42): TileSetDefinition {
  const enabledTiles = TILE_CODES.slice(0, count);
  const maxCopies = Object.fromEntries(
    enabledTiles.map((tile) => [tile, count === 42 && TILE_CODES.indexOf(tile) >= 34 ? 1 : 4]),
  ) as Partial<Record<TileCode, number>>;

  return {
    enabledTiles,
    maxCopies,
    groups: [
      { id: 'suited', labelKey: '牌组', tiles: enabledTiles.slice(0, 27) },
      { id: 'honors', labelKey: 'tiles.honors', tiles: enabledTiles.slice(27, 34) },
      { id: 'flowers', labelKey: 'tiles.flowers', tiles: enabledTiles.slice(34) },
    ],
  };
}

describe('TilePalette', () => {
  it.each([27, 34, 42] as const)(
    'renders the %i Rule TileSet without fixed tile assumptions',
    (count) => {
      const { container } = render(
        <TilePalette tileSet={tileSetFixture(count)} tileCounts={{}} onTileSelect={vi.fn()} />,
      );

      expect(container.querySelectorAll('[data-tile-code]')).toHaveLength(count);
    },
  );

  it('shows the global count, disables at the configured limit, and keeps the tile in place', async () => {
    const user = userEvent.setup();
    const onTileSelect = vi.fn();
    const { rerender } = render(
      <TilePalette
        tileSet={tileSetFixture(34)}
        tileCounts={{ m1: 4 }}
        onTileSelect={onTileSelect}
      />,
    );
    const disabledTile = screen.getByRole('button', { name: /一万，已使用 4 张/ });

    expect(disabledTile).toBeDisabled();
    expect(disabledTile).toHaveTextContent('×4');
    expect(disabledTile).toHaveAttribute('data-tile-code', 'm1');

    rerender(
      <TilePalette
        tileSet={tileSetFixture(34)}
        tileCounts={{ m1: 3 }}
        onTileSelect={onTileSelect}
      />,
    );
    const enabledTile = screen.getByRole('button', { name: /一万，已使用 3 张/ });

    expect(enabledTile).toBeEnabled();
    await user.click(enabledTile);
    expect(onTileSelect).toHaveBeenCalledWith('m1');
  });
});
