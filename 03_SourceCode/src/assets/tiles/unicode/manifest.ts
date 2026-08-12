import { TILE_CODES, type TileCode } from '../../../domain/mahjong/tile';

export type TileAssetManifest = Readonly<{
  setId: string;
  author: string;
  source: string;
  license: string;
  modified: boolean;
  renderer: 'unicode';
  assets: Readonly<Record<TileCode, string>>;
}>;

const unicodeAssets = Object.fromEntries(
  TILE_CODES.map((tileCode) => [tileCode, `unicode:${tileCode}`]),
) as Record<TileCode, string>;

export const UNICODE_TILE_ASSET_MANIFEST: TileAssetManifest = Object.freeze({
  setId: 'unicode-mahjong-tiles-v1',
  author: 'Unicode Consortium character repertoire; rendered by the user agent font',
  source: 'https://www.unicode.org/charts/PDF/U1F000.pdf',
  license: 'Unicode License Agreement v3',
  modified: false,
  renderer: 'unicode',
  assets: Object.freeze(unicodeAssets),
});

export function resolveTileAsset(tileCode: TileCode): string {
  return UNICODE_TILE_ASSET_MANIFEST.assets[tileCode];
}
