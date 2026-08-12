import { readFile } from 'node:fs/promises';

const tileSource = await readFile(
  new URL('../src/domain/mahjong/tile.ts', import.meta.url),
  'utf8',
);
const manifestSource = await readFile(
  new URL('../src/assets/tiles/unicode/manifest.ts', import.meta.url),
  'utf8',
);

for (const field of ['setId', 'author', 'source', 'license', 'modified', 'assets']) {
  if (!manifestSource.includes(`${field}:`)) {
    throw new Error(`Tile Asset Manifest is missing required field: ${field}`);
  }
}

if (!manifestSource.includes('TILE_CODES.map')) {
  throw new Error('Tile Asset Manifest must derive its complete asset map from TILE_CODES.');
}

if (!tileSource.includes('export const TILE_CODES')) {
  throw new Error('Cannot verify Tile Asset Manifest without the canonical TileCode list.');
}

console.log('Tile Asset Manifest completeness verified (dynamic TILE_CODES coverage).');
