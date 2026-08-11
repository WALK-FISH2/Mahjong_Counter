export const TILE_CODES = [
  'm1',
  'm2',
  'm3',
  'm4',
  'm5',
  'm6',
  'm7',
  'm8',
  'm9',
  'p1',
  'p2',
  'p3',
  'p4',
  'p5',
  'p6',
  'p7',
  'p8',
  'p9',
  's1',
  's2',
  's3',
  's4',
  's5',
  's6',
  's7',
  's8',
  's9',
  'east',
  'south',
  'west',
  'north',
  'red',
  'green',
  'white',
  'spring',
  'summer',
  'autumn',
  'winter',
  'plum',
  'orchid',
  'bamboo',
  'chrysanthemum',
] as const;

export type TileCode = (typeof TILE_CODES)[number];

export type SuitedTileCode = Extract<TileCode, `m${number}` | `p${number}` | `s${number}`>;
export type HonorTileCode = Extract<
  TileCode,
  'east' | 'south' | 'west' | 'north' | 'red' | 'green' | 'white'
>;
export type FlowerTileCode = Exclude<TileCode, SuitedTileCode | HonorTileCode>;

export type TileRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type TileSuit = 'characters' | 'dots' | 'bamboo';

type TileMetadataBase<TCode extends TileCode> = Readonly<{
  code: TCode;
  chineseName: string;
  sortIndex: number;
}>;

export type SuitedTileMetadata = TileMetadataBase<SuitedTileCode> &
  Readonly<{
    kind: 'suited';
    suit: TileSuit;
    rank: TileRank;
  }>;

export type HonorTileMetadata = TileMetadataBase<HonorTileCode> &
  Readonly<{
    kind: 'honor';
    honorKind: 'wind' | 'dragon';
  }>;

export type FlowerTileMetadata = TileMetadataBase<FlowerTileCode> &
  Readonly<{
    kind: 'flower';
    flowerKind: 'season' | 'plant';
  }>;

export type TileMetadata = SuitedTileMetadata | HonorTileMetadata | FlowerTileMetadata;

export const TILE_METADATA = {
  m1: {
    code: 'm1',
    kind: 'suited',
    suit: 'characters',
    rank: 1,
    chineseName: '一万',
    sortIndex: 0,
  },
  m2: {
    code: 'm2',
    kind: 'suited',
    suit: 'characters',
    rank: 2,
    chineseName: '二万',
    sortIndex: 1,
  },
  m3: {
    code: 'm3',
    kind: 'suited',
    suit: 'characters',
    rank: 3,
    chineseName: '三万',
    sortIndex: 2,
  },
  m4: {
    code: 'm4',
    kind: 'suited',
    suit: 'characters',
    rank: 4,
    chineseName: '四万',
    sortIndex: 3,
  },
  m5: {
    code: 'm5',
    kind: 'suited',
    suit: 'characters',
    rank: 5,
    chineseName: '五万',
    sortIndex: 4,
  },
  m6: {
    code: 'm6',
    kind: 'suited',
    suit: 'characters',
    rank: 6,
    chineseName: '六万',
    sortIndex: 5,
  },
  m7: {
    code: 'm7',
    kind: 'suited',
    suit: 'characters',
    rank: 7,
    chineseName: '七万',
    sortIndex: 6,
  },
  m8: {
    code: 'm8',
    kind: 'suited',
    suit: 'characters',
    rank: 8,
    chineseName: '八万',
    sortIndex: 7,
  },
  m9: {
    code: 'm9',
    kind: 'suited',
    suit: 'characters',
    rank: 9,
    chineseName: '九万',
    sortIndex: 8,
  },
  p1: { code: 'p1', kind: 'suited', suit: 'dots', rank: 1, chineseName: '一筒', sortIndex: 9 },
  p2: { code: 'p2', kind: 'suited', suit: 'dots', rank: 2, chineseName: '二筒', sortIndex: 10 },
  p3: { code: 'p3', kind: 'suited', suit: 'dots', rank: 3, chineseName: '三筒', sortIndex: 11 },
  p4: { code: 'p4', kind: 'suited', suit: 'dots', rank: 4, chineseName: '四筒', sortIndex: 12 },
  p5: { code: 'p5', kind: 'suited', suit: 'dots', rank: 5, chineseName: '五筒', sortIndex: 13 },
  p6: { code: 'p6', kind: 'suited', suit: 'dots', rank: 6, chineseName: '六筒', sortIndex: 14 },
  p7: { code: 'p7', kind: 'suited', suit: 'dots', rank: 7, chineseName: '七筒', sortIndex: 15 },
  p8: { code: 'p8', kind: 'suited', suit: 'dots', rank: 8, chineseName: '八筒', sortIndex: 16 },
  p9: { code: 'p9', kind: 'suited', suit: 'dots', rank: 9, chineseName: '九筒', sortIndex: 17 },
  s1: { code: 's1', kind: 'suited', suit: 'bamboo', rank: 1, chineseName: '一条', sortIndex: 18 },
  s2: { code: 's2', kind: 'suited', suit: 'bamboo', rank: 2, chineseName: '二条', sortIndex: 19 },
  s3: { code: 's3', kind: 'suited', suit: 'bamboo', rank: 3, chineseName: '三条', sortIndex: 20 },
  s4: { code: 's4', kind: 'suited', suit: 'bamboo', rank: 4, chineseName: '四条', sortIndex: 21 },
  s5: { code: 's5', kind: 'suited', suit: 'bamboo', rank: 5, chineseName: '五条', sortIndex: 22 },
  s6: { code: 's6', kind: 'suited', suit: 'bamboo', rank: 6, chineseName: '六条', sortIndex: 23 },
  s7: { code: 's7', kind: 'suited', suit: 'bamboo', rank: 7, chineseName: '七条', sortIndex: 24 },
  s8: { code: 's8', kind: 'suited', suit: 'bamboo', rank: 8, chineseName: '八条', sortIndex: 25 },
  s9: { code: 's9', kind: 'suited', suit: 'bamboo', rank: 9, chineseName: '九条', sortIndex: 26 },
  east: { code: 'east', kind: 'honor', honorKind: 'wind', chineseName: '东风', sortIndex: 27 },
  south: { code: 'south', kind: 'honor', honorKind: 'wind', chineseName: '南风', sortIndex: 28 },
  west: { code: 'west', kind: 'honor', honorKind: 'wind', chineseName: '西风', sortIndex: 29 },
  north: { code: 'north', kind: 'honor', honorKind: 'wind', chineseName: '北风', sortIndex: 30 },
  red: { code: 'red', kind: 'honor', honorKind: 'dragon', chineseName: '红中', sortIndex: 31 },
  green: { code: 'green', kind: 'honor', honorKind: 'dragon', chineseName: '发财', sortIndex: 32 },
  white: { code: 'white', kind: 'honor', honorKind: 'dragon', chineseName: '白板', sortIndex: 33 },
  spring: {
    code: 'spring',
    kind: 'flower',
    flowerKind: 'season',
    chineseName: '春',
    sortIndex: 34,
  },
  summer: {
    code: 'summer',
    kind: 'flower',
    flowerKind: 'season',
    chineseName: '夏',
    sortIndex: 35,
  },
  autumn: {
    code: 'autumn',
    kind: 'flower',
    flowerKind: 'season',
    chineseName: '秋',
    sortIndex: 36,
  },
  winter: {
    code: 'winter',
    kind: 'flower',
    flowerKind: 'season',
    chineseName: '冬',
    sortIndex: 37,
  },
  plum: { code: 'plum', kind: 'flower', flowerKind: 'plant', chineseName: '梅', sortIndex: 38 },
  orchid: { code: 'orchid', kind: 'flower', flowerKind: 'plant', chineseName: '兰', sortIndex: 39 },
  bamboo: { code: 'bamboo', kind: 'flower', flowerKind: 'plant', chineseName: '竹', sortIndex: 40 },
  chrysanthemum: {
    code: 'chrysanthemum',
    kind: 'flower',
    flowerKind: 'plant',
    chineseName: '菊',
    sortIndex: 41,
  },
} as const satisfies Readonly<Record<TileCode, TileMetadata>>;

const TILE_CODE_SET: ReadonlySet<string> = new Set(TILE_CODES);

export function isTileCode(value: unknown): value is TileCode {
  return typeof value === 'string' && TILE_CODE_SET.has(value);
}

export function getTileMetadata(tile: TileCode): TileMetadata {
  return TILE_METADATA[tile];
}

export function compareTileCodes(left: TileCode, right: TileCode): number {
  return TILE_METADATA[left].sortIndex - TILE_METADATA[right].sortIndex;
}
