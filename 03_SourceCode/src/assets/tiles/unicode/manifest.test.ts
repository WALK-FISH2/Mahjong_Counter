import { describe, expect, it } from 'vitest';

import { TILE_CODES } from '../../../domain/mahjong/tile';
import { UNICODE_TILE_ASSET_MANIFEST, resolveTileAsset } from './manifest';

describe('Tile Asset Manifest', () => {
  it('contains attribution and resolves every canonical TileCode', () => {
    expect(UNICODE_TILE_ASSET_MANIFEST.setId.length).toBeGreaterThan(0);
    expect(UNICODE_TILE_ASSET_MANIFEST.author.length).toBeGreaterThan(0);
    expect(UNICODE_TILE_ASSET_MANIFEST.source).toMatch(/^https:/);
    expect(UNICODE_TILE_ASSET_MANIFEST.license.length).toBeGreaterThan(0);
    expect(UNICODE_TILE_ASSET_MANIFEST.modified).toBe(false);
    expect(Object.keys(UNICODE_TILE_ASSET_MANIFEST.assets)).toEqual(TILE_CODES);
    expect(TILE_CODES.map(resolveTileAsset)).toHaveLength(TILE_CODES.length);
  });

  it('keeps presentation asset identity separate from TileCode', () => {
    expect(resolveTileAsset('m1')).toBe('unicode:m1');
    expect(resolveTileAsset('m1')).not.toBe('m1');
  });
});
