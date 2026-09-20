import { getTileMetadata, type TileCode } from '../../domain/mahjong/tile';

const HONOR_SYMBOLS = {
  east: '\u{1f000}',
  south: '\u{1f001}',
  west: '\u{1f002}',
  north: '\u{1f003}',
  red: '\u{1f004}',
  green: '\u{1f005}',
  white: '\u{1f006}',
} as const;

const FLOWER_SYMBOLS = {
  plum: '\u{1f022}',
  orchid: '\u{1f023}',
  bamboo: '\u{1f024}',
  chrysanthemum: '\u{1f025}',
  spring: '\u{1f026}',
  summer: '\u{1f027}',
  autumn: '\u{1f028}',
  winter: '\u{1f029}',
} as const;

const SUIT_SYMBOL_BASE = {
  characters: 0x1f006,
  bamboo: 0x1f00f,
  dots: 0x1f018,
} as const;

export function getTileSymbol(tile: TileCode): string {
  const metadata = getTileMetadata(tile);

  if (metadata.kind === 'suited') {
    return String.fromCodePoint(SUIT_SYMBOL_BASE[metadata.suit] + metadata.rank);
  }

  if (metadata.kind === 'honor') {
    return HONOR_SYMBOLS[tile as keyof typeof HONOR_SYMBOLS];
  }

  return FLOWER_SYMBOLS[tile as keyof typeof FLOWER_SYMBOLS];
}
